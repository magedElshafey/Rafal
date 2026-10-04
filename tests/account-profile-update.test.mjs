import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
let interceptedFetch = globalThis.fetch;

function createLoader(overrides = {}, runtimeConsole = console) {
  const modules = new Map();
  return function loadSource(relativePath) {
    const base = path.join(root, relativePath);
    const filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    assert.ok(filename, `Resolve ${relativePath}`);
    if (modules.has(filename)) return modules.get(filename).exports;

    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    const loaded = { exports: {} };
    modules.set(filename, loaded);
    vm.runInNewContext(
      outputText,
      {
        AbortSignal,
        DOMException,
        FormData,
        Headers,
        Response,
        URL,
        console: runtimeConsole,
        exports: loaded.exports,
        fetch: (...args) => interceptedFetch(...args),
        module: loaded,
        process,
        require: (specifier) => {
          if (specifier in overrides) return overrides[specifier];
          if (specifier.startsWith("@/")) {
            return loadSource(`src/${specifier.slice(2)}`);
          }
          if (specifier.startsWith(".")) {
            const resolved = path
              .relative(root, path.resolve(path.dirname(filename), specifier))
              .replaceAll("\\", "/");
            return loadSource(resolved);
          }
          return require(specifier);
        },
      },
      { filename },
    );
    return loaded.exports;
  };
}

function authUser(overrides = {}) {
  return {
    id: 7,
    first_name: "Maged",
    last_name: "Elshafey",
    email: "customer@example.test",
    phone: "+966501234567",
    profile_complete: true,
    created_at: "2026-10-04T10:00:00Z",
    ...overrides,
  };
}

function successfulResponse(userOverrides) {
  return {
    success: true,
    message: "updated",
    data: authUser(userOverrides),
  };
}

function createApiHarness() {
  const transportLoader = createLoader();
  const { createHttpClient } = transportLoader("src/lib/api/http-client");
  const serverApi = createHttpClient({
    baseUrl: new URL("https://api.example.test/api"),
    maxRetries: 0,
  });
  const loadSource = createLoader({
    "server-only": {},
    "@/lib/api/server-api": { serverApi },
  });
  return loadSource("src/features/auth/api/auth-api.server");
}

function createActionHarness() {
  let behavior = async () => successfulResponse();
  let clearAccessTokenCalls = 0;
  const revalidatedPaths = [];
  const diagnostics = [];
  const runtimeConsole = {
    ...console,
    error: (...args) => diagnostics.push(args),
  };
  class TestApiError extends Error {
    constructor({ status, message, code, details }) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.code = code;
      this.details = details;
    }
  }
  const clearAccessToken = async () => {
    clearAccessTokenCalls += 1;
  };
  const loadSource = createLoader(
    {
      "server-only": {},
      "next/cache": {
        revalidatePath: (value) => revalidatedPaths.push(value),
      },
      "next-intl": {
        hasLocale: (locales, value) => locales.includes(value),
      },
      "@/features/auth/api/auth-api.server": {
        updateProfileDto: (...args) => behavior(...args),
      },
      "@/features/auth/actions/auth-action-utils": {
        isPlainRecord: (value) =>
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value),
        mapProtectedAuthActionError: async (error) => {
          if (error instanceof TestApiError && error.status === 401) {
            await clearAccessToken();
            return { ok: false, error: { code: "unauthorized" } };
          }
          return { ok: false, error: { code: "service-unavailable" } };
        },
      },
      "@/features/auth/server/auth-session": {
        clearAccessToken,
        getAccessToken: async () => "server-only-token",
      },
      "@/i18n/routing": { routing: { locales: ["ar", "en"] } },
      "@/lib/api/api-error": { ApiError: TestApiError },
    },
    runtimeConsole,
  );
  const { updateAccountProfile } = loadSource(
    "src/features/account/profile/actions/update-account-profile",
  );

  return {
    ApiError: TestApiError,
    diagnostics,
    getClearAccessTokenCalls: () => clearAccessTokenCalls,
    revalidatedPaths,
    setBehavior: (nextBehavior) => {
      behavior = nextBehavior;
    },
    updateAccountProfile,
  };
}

const validActionInput = {
  locale: "en",
  firstName: "Maged",
  lastName: "Elshafey",
  phone: "050 123 4567",
};

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("Edit Profile sends the exact multipart backend contract once", async () => {
  const { updateProfileDto } = createApiHarness();
  const calls = [];
  interceptedFetch = async (...args) => {
    calls.push(args);
    return Response.json(successfulResponse());
  };

  await updateProfileDto("en", "secret-token", {
    first_name: "Maged",
    last_name: "Elshafey",
    phone: "+966501234567",
  });

  assert.equal(calls.length, 1);
  const [input, init] = calls[0];
  assert.equal(String(input), "https://api.example.test/api/auth/complete-profile");
  assert.equal(init.method, "POST");
  assert.ok(init.body instanceof FormData);
  assert.deepEqual(Array.from(init.body.entries()), [
    ["first_name", "Maged"],
    ["last_name", "Elshafey"],
    ["phone", "+966501234567"],
    ["terms_accepted", "1"],
  ]);
  const headers = new Headers(init.headers);
  assert.equal(headers.get("Authorization"), "Bearer secret-token");
  assert.equal(headers.get("Accept-Language"), "en");
  assert.equal(headers.has("Content-Type"), false);
  assert.equal(headers.has("X-Cart-Token"), false);
  assert.equal(init.body.has("email"), false);
});

test("Edit Profile 422 is not retried and remains a rejected request", async () => {
  const { updateProfileDto } = createApiHarness();
  let callCount = 0;
  interceptedFetch = async () => {
    callCount += 1;
    return Response.json(
      { message: "invalid", errors: { terms_accepted: ["required"] } },
      { status: 422 },
    );
  };

  await assert.rejects(() =>
    updateProfileDto("en", "secret-token", {
      first_name: "Maged",
      last_name: "Elshafey",
      phone: "+966501234567",
    }),
  );
  assert.equal(callCount, 1);
});

test("Onboarding keeps its required multipart complete-profile contract", async () => {
  const { completeProfileDto } = createApiHarness();
  let requestBody;
  interceptedFetch = async (_input, init) => {
    requestBody = init.body;
    return Response.json(successfulResponse());
  };

  await completeProfileDto("ar", "secret-token", {
    first_name: "Maged",
    last_name: "Elshafey",
    phone: "+966501234567",
    terms_accepted: true,
  });

  assert.ok(requestBody instanceof FormData);
  assert.equal(requestBody.get("terms_accepted"), "1");
  assert.equal(requestBody.get("first_name"), "Maged");
  assert.equal(requestBody.get("last_name"), "Elshafey");
  assert.equal(requestBody.get("phone"), "+966501234567");
});

test("Malformed 200 profile response fails closed in the auth parser", async () => {
  const { updateProfileDto } = createApiHarness();
  interceptedFetch = async () =>
    Response.json({ success: true, message: "updated", data: {} });

  await assert.rejects(() =>
    updateProfileDto("en", "secret-token", {
      first_name: "Maged",
      last_name: "Elshafey",
      phone: "+966501234567",
    }),
  );
});

test("Confirmed backend user is the only success and revalidation path", async () => {
  const harness = createActionHarness();
  const result = await harness.updateAccountProfile(validActionInput);

  assert.deepEqual(plain(result), {
    ok: true,
    profile: {
      firstName: "Maged",
      lastName: "Elshafey",
      phone: "+966501234567",
    },
  });
  assert.deepEqual(harness.revalidatedPaths, ["/en/account/profile"]);
});

test("Valid but unchanged success payload is rejected without revalidation", async () => {
  const harness = createActionHarness();
  harness.setBehavior(async () =>
    successfulResponse({ first_name: "Original" }),
  );

  const result = await harness.updateAccountProfile(validActionInput);
  assert.deepEqual(plain(result), {
    ok: false,
    error: { code: "service-unavailable" },
  });
  assert.deepEqual(harness.revalidatedPaths, []);
  assert.equal(harness.diagnostics.length, 1);
});

test("success false never becomes profile success or revalidation", async () => {
  const harness = createActionHarness();
  harness.setBehavior(async () => ({
    ...successfulResponse(),
    success: false,
  }));

  const result = await harness.updateAccountProfile(validActionInput);
  assert.deepEqual(plain(result), {
    ok: false,
    error: { code: "service-unavailable" },
  });
  assert.deepEqual(harness.revalidatedPaths, []);
});

test("editable-field 422 maps safely and cannot revalidate", async () => {
  const harness = createActionHarness();
  harness.setBehavior(async () => {
    throw new harness.ApiError({
      status: 422,
      message: "invalid",
      details: { first_name: ["invalid"], phone: ["invalid"] },
    });
  });

  const result = await harness.updateAccountProfile(validActionInput);
  assert.deepEqual(plain(result), {
    ok: false,
    error: {
      code: "invalid-input",
      fields: { firstName: "invalid", phone: "phone" },
    },
  });
  assert.deepEqual(harness.revalidatedPaths, []);
});

test("backend-only terms validation becomes a generic safe failure", async () => {
  const harness = createActionHarness();
  harness.setBehavior(async () => {
    throw new harness.ApiError({
      status: 422,
      message: "invalid",
      details: { terms_accepted: ["required"] },
    });
  });

  const result = await harness.updateAccountProfile(validActionInput);
  assert.deepEqual(plain(result), {
    ok: false,
    error: { code: "invalid-input", fields: {} },
  });
  assert.deepEqual(harness.revalidatedPaths, []);
  assert.equal(harness.diagnostics.length, 1);
  assert.equal(harness.diagnostics[0][1].field, "terms_accepted");
});

test("network, 429, and 500 failures remain generic failures", async () => {
  for (const failure of [
    new Error("network unavailable"),
    { status: 429, message: "rate limited" },
    { status: 500, message: "backend unavailable" },
  ]) {
    const harness = createActionHarness();
    harness.setBehavior(async () => {
      if (failure instanceof Error) throw failure;
      throw new harness.ApiError(failure);
    });
    const result = await harness.updateAccountProfile(validActionInput);
    assert.deepEqual(plain(result), {
      ok: false,
      error: { code: "service-unavailable" },
    });
    assert.deepEqual(harness.revalidatedPaths, []);
  }
});

test("401 clears the protected session and returns unauthorized", async () => {
  const harness = createActionHarness();
  harness.setBehavior(async () => {
    throw new harness.ApiError({ status: 401, message: "expired" });
  });

  const result = await harness.updateAccountProfile(validActionInput);
  assert.deepEqual(plain(result), {
    ok: false,
    error: { code: "unauthorized" },
  });
  assert.equal(harness.getClearAccessTokenCalls(), 1);
  assert.deepEqual(harness.revalidatedPaths, []);
});

test("Edit Profile exposes no terms or email mutation state and gates success toast", () => {
  const formSource = readFileSync(
    path.join(root, "src/features/account/profile/components/profile-form.tsx"),
    "utf8",
  );
  const typeSource = readFileSync(
    path.join(root, "src/features/account/profile/types/account-profile.types.ts"),
    "utf8",
  );
  const failureGuard = formSource.indexOf("if (!result.ok)");
  const successToast = formSource.indexOf("rafalToast.success", failureGuard);

  assert.ok(failureGuard >= 0 && successToast > failureGuard);
  assert.doesNotMatch(typeSource, /termsAccepted|email.*AccountProfileInput/);
  assert.doesNotMatch(formSource, /name=["']termsAccepted["']/);
  assert.match(formSource, /name="email"[\s\S]*?readOnly/);
});
