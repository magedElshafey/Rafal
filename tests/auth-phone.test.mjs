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
          if (specifier === "next/cache") return { revalidatePath() {} };
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

const phone = "+966501234567";
const user = { id: 13, first_name: null, last_name: null, email: null, phone, profile_complete: false, created_at: "2026-10-15" };
const envelope = (complete = false) => ({ success: true, message: "ok", data: { user, token: "private-token", profile_complete: complete } });
const plain = (value) => JSON.parse(JSON.stringify(value));
const input = (value) => Object.assign(Object.create(null), value);

function rootLocaleInAction() {
  // Execute the installed Next.js guard with a Server Action context.
  const loaded = { exports: {} };
  vm.runInNewContext(readFileSync(path.join(root, "node_modules/next/dist/server/request/root-params.js"), "utf8"), {
    exports: loaded.exports,
    module: loaded,
    require: (specifier) => {
      if (specifier.endsWith("/work-async-storage.external")) return { workAsyncStorage: { getStore: () => ({ route: "/[locale]/register" }) } };
      if (specifier.endsWith("/work-unit-async-storage.external")) return { workUnitAsyncStorage: { getStore: () => ({ phase: "action" }) } };
      if (specifier.endsWith("/action-async-storage.external")) return { actionAsyncStorage: { getStore: () => ({ isAction: true }) } };
      return {};
    },
  });
  return loaded.exports.getRootParam("locale");
}

test("installed Next root-params guard reproduces identity lookup failure before Laravel", async () => {
  let load;
  let requests = 0;
  const mutationCalls = [];
  load = createLoader({
    "server-only": {},
    react: { cache: (fn) => fn },
    "next/cache": { revalidatePath: () => {} },
    "next/root-params": { locale: rootLocaleInAction },
    "next-intl": { hasLocale: (locales, value) => locales.includes(value) },
    "next-intl/server": {
      getRequestConfig: (fn) => fn,
      getLocale: async () => (await load("src/i18n/request").default({})).locale,
    },
    "@/i18n/navigation": {},
    "@/i18n/routing": { routing: { locales: ["ar", "en"], defaultLocale: "ar" } },
    "@/features/auth/server/auth-session": { getAccessToken: async () => "private-token" },
    "@/features/auth/api/auth-api.server": {
      getMeDto: async (locale, token) => {
        requests++;
        assert.equal(locale, "ar");
        assert.equal(token, "private-token");
        return { success: true, data: liveCompleteProfileResponse.data };
      },
      completeProfileDto: async (...args) => { mutationCalls.push(args); return liveCompleteProfileResponse; },
      updateProfileDto: async (...args) => { mutationCalls.push(args); return liveCompleteProfileResponse; },
    },
  }, { info() {}, error() {} });
  await assert.rejects(() => load("src/features/auth/server/auth-boundary").getCurrentUser(), (error) => error.__NEXT_ERROR_CODE === "E1014");
  assert.equal(requests, 0);
  const onboarding = await load("src/features/auth/actions/complete-profile").completeProfile(input({ firstName: "mohamed", lastName: "ahmed", termsAccepted: true }), "ar");
  assert.equal(onboarding.ok, true);
  const edit = await load("src/features/account/profile/actions/update-account-profile").updateAccountProfile(input({ locale: "ar", firstName: "mohamed", lastName: "ahmed", phone: "0551235474", email: "" }));
  assert.equal(edit.ok, true);
  assert.equal(requests, 2);
  for (const [locale, token, body] of mutationCalls) {
    assert.equal(locale, "ar");
    assert.equal(token, "private-token");
    assert.equal(body.phone, liveCompleteProfileResponse.data.phone);
  }
  assert.equal(mutationCalls.length, 2);
});

const liveCompleteProfileResponse = {
  success: true,
  message: "Profile completed successfully",
  data: {
    id: 14,
    first_name: "mohamed",
    last_name: "ahmed",
    email: null,
    phone: "+966551235474",
    profile_complete: true,
    created_at: "2026-10-15T04:01:04+00:00",
  },
};

test("exact supplied live response already satisfies direct-user parser and Complete Profile action", async () => {
  const h = harness({ payload: liveCompleteProfileResponse, identityPhone: "0551235474" });
  const parser = h.load("src/features/auth/api/parse-auth-dto");
  assert.deepEqual(plain(parser.parseAuthUserResponse(liveCompleteProfileResponse)), liveCompleteProfileResponse);
  assert.throws(() => parser.parseVerifyOtpResponse(liveCompleteProfileResponse));
  const result = await h.load("src/features/auth/actions/complete-profile").completeProfile(input({ firstName: "mohamed", lastName: "ahmed", termsAccepted: true }), "ar");
  assert.equal(result.ok, true);
  assert.equal(result.user.email, null);
  assert.equal(result.profileComplete, true);
  assert.deepEqual(Object.fromEntries(h.calls[0].body), {
    first_name: "mohamed", last_name: "ahmed", phone: liveCompleteProfileResponse.data.phone, terms_accepted: "1",
  });
  assert.equal(h.calls[0].headers.Authorization, "Bearer private-token");
  assert.equal(h.calls[0].headers["Accept-Language"], "ar");
  assert.equal(h.calls[0].body.has("email"), false);
  assert.equal(h.calls[0].headers["Content-Type"], undefined);
  assert.equal(h.calls[0].retry, false);
  assert.equal(h.logs.at(-1)[1].category, "confirmed");
  assert.deepEqual(h.events, []);
  const diagnostics = JSON.stringify(h.logs);
  for (const secret of ["private-token", "mohamed", "ahmed", liveCompleteProfileResponse.data.phone]) {
    assert.equal(diagnostics.includes(secret), false);
  }
});

test("temporary diagnostics distinguish identity, request, parser, and confirmation without private details", async () => {
  const scenarios = [
    [{ identityFailure: new Error("private identity") }, "identity", "identity-read-failed"],
    [{ failure: new Error("private transport") }, "request", "transport-or-response-read"],
    [{ payload: { success: true, data: {} } }, "response-parse", "invalid-contract"],
    [{ payload: { ...liveCompleteProfileResponse, success: false } }, "confirmation", "unsuccessful-envelope"],
    [{ payload: liveCompleteProfileResponse }, "confirmation", "identity-mismatch"],
  ];
  for (const [options, stage, category] of scenarios) {
    const h = harness(options);
    const result = await h.load("src/features/auth/actions/complete-profile").completeProfile(input({ firstName: "mohamed", lastName: "ahmed", termsAccepted: true }), "ar");
    assert.equal(result.ok, false);
    assert.ok(h.logs.some(([, entry]) => entry.stage === stage && entry.category === category));
    for (const [, entry] of h.logs) {
      assert.ok(Object.keys(entry).every((key) => ["stage", "category", "upstreamStatus", "successPresent", "dataPresent", "profileCompleteIsBoolean"].includes(key)));
    }
    assert.equal(JSON.stringify(h.logs).includes("private"), false);
  }
});

test("confirmed Complete Profile result continues Cart merge without setting generic error", async () => {
  const tasks = [], errors = [], routes = [];
  let stateIndex = 0, merged = 0;
  const load = createLoader({
    react: {
      useState: (initial) => {
        const index = stateIndex++;
        return [index === 0 ? { firstName: "mohamed", lastName: "ahmed", phone: "0551235474" } : index === 1 ? true : initial,
          (value) => { if (index === 3) errors.push(value); }];
      },
      useTransition: () => [false, (task) => tasks.push(task())],
    },
    "@/components/ui/button": { Button: "button" },
    "@/components/ui/checkbox": { Checkbox: "checkbox" },
    "@/components/ui/input": { InputField: "input-field" },
    "@/components/ui/saudi-mobile-field": { SaudiMobileField: "phone-field" },
    "@/features/auth/actions/complete-profile": { completeProfile: async () => ({ ok: true, profileComplete: true }) },
    "@/features/auth/hooks/use-post-auth-cart-merge": { usePostAuthCartMerge: () => ({ mergeAndContinue: async () => { merged++; } }) },
    "@/i18n/navigation": { useRouter: () => ({ replace: (route) => routes.push(route) }) },
  });
  const tree = load("src/features/auth/components/CompleteProfileForm").CompleteProfileForm({ copy: { unavailable: "generic failure" }, locale: "ar", phone: liveCompleteProfileResponse.data.phone, returnTo: "/" });
  tree.props.onSubmit({ preventDefault() {} });
  await Promise.all(tasks);
  assert.equal(merged, 1);
  assert.deepEqual(errors, []);
  assert.deepEqual(routes, []);
});

function harness(options = {}) {
  const calls = [], events = [], logs = [];
  const load = createLoader({
    "server-only": {},
    "next-intl": { hasLocale: (locales, value) => locales.includes(value) },
    "@/i18n/routing": { routing: { locales: ["ar", "en"] } },
    "@/lib/api/server-api": { serverApi: { request: async (request) => {
      calls.push(request);
      if (options.failure) throw options.failure;
      return options.payload ?? (request.path.endsWith("/verify") ? envelope() : { success: true, message: "ok" });
    } } },
    "@/features/auth/server/auth-session": {
      getPendingOtpPhone: async () => options.pending === false ? null : phone,
      setPendingOtpPhone: async (value) => events.push(["pending", value]),
      clearPendingOtpPhone: async () => events.push(["clear"]),
      setAccessToken: async (value) => { if (options.sessionFailure) throw new Error("private"); events.push(["session", value]); },
      getAccessToken: async () => "private-token",
      clearAccessToken: async () => {},
    },
    "@/features/auth/server/auth-boundary": { getCurrentUser: async () => { if (options.identityFailure) throw options.identityFailure; return { phone: options.identityPhone ?? phone }; } },
  }, { info: (...args) => logs.push(args), log: (...args) => logs.push(args), error: (...args) => logs.push(args), warn: (...args) => logs.push(args) });
  return { load, calls, events, logs };
}

test("Saudi formats normalize through the shared utility; non-Saudi numbers fail", () => {
  const { normalizeSaudiMobile } = createLoader()("src/lib/phone/saudi-mobile");
  for (const value of ["501234567", "0501234567", phone, "966501234567", "00966501234567", "050 123-4567"]) assert.equal(normalizeSaudiMobile(value), phone);
  for (const value of ["", "+201012345678", "123", "+966401234567"]) assert.equal(normalizeSaudiMobile(value), null);
});

test("request normalizes, sends exactly phone once with retry disabled, and stores only the handoff", async () => {
  const h = harness();
  const result = await h.load("src/features/auth/actions/request-otp").requestOtp(input({ phone: "050 123 4567", email: "ignored", token: "ignored" }), "ar");
  assert.equal(result.ok, true);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].path, "/auth/phone/otp/request");
  assert.equal(h.calls[0].method, "POST");
  assert.equal(h.calls[0].retry, false);
  assert.deepEqual(plain(h.calls[0].body), { phone });
  assert.deepEqual(h.events, [["pending", phone]]);
  assert.deepEqual(h.logs, []);
});

test("invalid phone never reaches transport; missing/false success never creates handoff", async () => {
  const h = harness();
  assert.equal((await h.load("src/features/auth/actions/request-otp").requestOtp(input({ phone: "+201012345678" }), "en")).ok, false);
  assert.equal(h.calls.length, 0);
  for (const payload of [{ message: "ok" }, { success: false, message: "ok" }]) {
    const failed = harness({ payload });
    assert.equal((await failed.load("src/features/auth/actions/request-otp").requestOtp(input({ phone }), "en")).ok, false);
    assert.deepEqual(failed.events, []);
  }
});

test("verify accepts nullable new-user fields, uses top-level completion, and persists session before success", async () => {
  for (const complete of [true, false]) {
    const h = harness({ payload: envelope(complete) });
    const result = await h.load("src/features/auth/actions/verify-otp").verifyOtp(input({ code: "123456" }), "en");
    assert.equal(result.ok, true);
    assert.equal(result.profileComplete, complete);
    assert.equal(result.user.email, null);
    assert.equal(result.user.firstName, "");
    assert.equal(result.user.phone, phone);
    assert.equal("token" in result, false);
    assert.deepEqual(h.events, [["session", "private-token"], ["clear"]]);
    assert.equal(h.calls[0].path, "/auth/phone/otp/verify");
    assert.equal(h.calls[0].retry, false);
    assert.deepEqual(plain(h.calls[0].body), { phone, otp: "123456" });
    assert.deepEqual(h.logs, []);
  }
});

test("malformed verification and failed session never return authenticated success", async () => {
  for (const field of ["user", "token", "profile_complete"]) {
    const payload = envelope(); delete payload.data[field];
    const h = harness({ payload });
    assert.equal((await h.load("src/features/auth/actions/verify-otp").verifyOtp(input({ code: "123456" }), "en")).ok, false);
    assert.deepEqual(h.events, []);
  }
  for (const value of ["false", 0, null]) {
    const payload = envelope(); payload.data.profile_complete = value;
    const h = harness({ payload });
    assert.equal((await h.load("src/features/auth/actions/verify-otp").verifyOtp(input({ code: "123456" }), "en")).ok, false);
  }
  const h = harness({ sessionFailure: true });
  assert.equal((await h.load("src/features/auth/actions/verify-otp").verifyOtp(input({ code: "123456" }), "en")).error.code, "session-failed");
});

test("expired handoff fails without upstream verification", async () => {
  const h = harness({ pending: false });
  assert.equal((await h.load("src/features/auth/actions/verify-otp").verifyOtp(input({ code: "123456" }), "ar")).error.code, "pending-phone-missing");
  assert.equal(h.calls.length, 0);
});

test("429 is distinct from invalid input and service failure", () => {
  const h = harness();
  const { ApiError } = h.load("src/lib/api/api-error");
  const { mapPublicAuthActionError } = h.load("src/features/auth/actions/auth-action-utils");
  for (const [status, code] of [[429, "rate-limited"], [422, "invalid-input"], [500, "service-unavailable"]]) {
    assert.equal(mapPublicAuthActionError(new ApiError({ status, message: "private backend detail" })).error.code, code);
  }
});

test("safe return destination preserves local paths and rejects malformed/external values with Home fallback", () => {
  const { getSafeInternalReturnTo: safe } = createLoader()("src/features/auth/utils/safe-return-to");
  for (const value of ["", "https://evil.test", "//evil.test", "javascript:alert(1)", "/\\evil.test", "/%2fevil.test", "/%zz", "/a/..//evil.test", "/%2e%2e//evil.test", "/\nevil.test"]) assert.equal(safe(value), "/");
  assert.equal(safe("/checkout?step=2#details"), "/checkout?step=2#details");
});

function formHarness(file, exportName, value, actionName, result) {
  let stateIndex = 0;
  const tasks = [], calls = [], routes = [], merges = [];
  const load = createLoader({
    react: { useState: (initial) => [stateIndex++ === 0 ? value : initial, () => {}], useRef: (value) => ({ current: value }), useTransition: () => [false, (task) => tasks.push(task())] },
    "@/components/ui/button": { Button: "button" },
    "@/components/ui/saudi-mobile-field": { SaudiMobileField: "saudi-field" },
    "./OtpInput": { OtpInput: "otp-field" },
    "@/i18n/navigation": { useRouter: () => ({ replace: (route) => routes.push(route) }) },
    [`@/features/auth/actions/${actionName}`]: { [actionName === "request-otp" ? "requestOtp" : "verifyOtp"]: async (...args) => { calls.push(args); return result; } },
    "@/features/auth/hooks/use-post-auth-cart-merge": { usePostAuthCartMerge: () => ({ mergeAndContinue: async () => merges.push(true) }) },
  });
  const tree = load(file)[exportName]({ locale: "en", returnTo: "/checkout", copy: {} });
  return { tree, tasks, calls, routes, merges };
}

test("Login reuses Saudi field and synchronous double submit produces one request", async () => {
  const h = formHarness("src/features/auth/components/EmailEntryForm", "EmailEntryForm", "0501234567", "request-otp", { ok: true });
  assert.equal(h.tree.props.children.props.children[0].type, "saudi-field");
  h.tree.props.onSubmit({ preventDefault() {} }); h.tree.props.onSubmit({ preventDefault() {} });
  await Promise.all(h.tasks);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(plain(h.calls[0][0]), { phone });
  assert.equal(h.routes[0].pathname, "/login/verify");
});

test("Verification double submit runs once and selects existing merge or registration journey", async () => {
  for (const complete of [true, false]) {
    const h = formHarness("src/features/auth/components/OtpVerificationForm", "OtpVerificationForm", "123456", "verify-otp", { ok: true, profileComplete: complete });
    h.tree.props.onSubmit({ preventDefault() {} }); h.tree.props.onSubmit({ preventDefault() {} });
    await Promise.all(h.tasks);
    assert.equal(h.calls.length, 1);
    assert.equal(h.merges.length, complete ? 1 : 0);
    if (!complete) assert.equal(h.routes[0].pathname, "/register");
  }
});

test("Complete Profile uses server identity even when the browser submits another phone", async () => {
  const h = harness({ payload: { success: true, message: "ok", data: { ...user, first_name: "A", last_name: "B", profile_complete: true } } });
  const result = await h.load("src/features/auth/actions/complete-profile").completeProfile(input({ firstName: "A", lastName: "B", phone: "+966599999999", termsAccepted: true }), "en");
  assert.equal(result.ok, true);
  assert.equal(h.calls[0].path, "/auth/complete-profile");
  assert.equal(h.calls[0].body.get("phone"), phone);
  assert.equal(h.calls[0].body.get("terms_accepted"), "1");
  assert.equal(h.calls[0].body.has("email"), false);
});

test("Cart merge still uses server tokens and deletes guest identity only after success", async () => {
  for (const success of [true, false]) {
    const events = [];
    const load = createLoader({
      "server-only": {},
      "@/features/auth/server/auth-session": { getAccessToken: async () => "auth-token" },
      "@/features/cart/server/guest-cart-session": { getGuestCartToken: async () => "guest-token", deleteGuestCartToken: async () => events.push("delete") },
      "@/features/cart/api/cart-api.server": { mergeGuestCartDto: async (...args) => { events.push(args); return { success, data: {} }; } },
      "@/features/cart/api/cart-mapper": { mapCartData: () => ({ items: [] }) },
    });
    const merge = load("src/features/cart/server/cart-merge-boundary").mergeGuestCartIntoAuthenticatedCart;
    if (success) assert.equal((await merge("en")).merged, true);
    else await assert.rejects(() => merge("en"));
    assert.deepEqual(events[0], ["auth-token", "guest-token", "en"]);
    assert.equal(events.includes("delete"), success);
  }
});

test("Session cookies retain HttpOnly policy and validate the phone handoff; logout clears both", async () => {
  const writes = [];
  const values = new Map();
  const load = createLoader({
    "server-only": {},
    "next/headers": { cookies: async () => ({ get: (name) => ({ value: values.get(name) }), set: (name, value, options) => { writes.push({ name, value, options }); values.set(name, value); } }) },
    "next-intl": { hasLocale: (_locales, value) => value === "en" },
    "@/i18n/routing": { routing: { locales: ["en", "ar"] } },
    "@/i18n/navigation": { redirect: (route) => route },
  });
  const session = load("src/features/auth/server/auth-session");
  await session.setPendingOtpPhone(phone);
  await session.setAccessToken("private-token");
  assert.equal(await session.getPendingOtpPhone(), phone);
  for (const { options } of writes) {
    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, "lax");
    assert.equal(options.path, "/");
  }
  values.set("rafal_auth_pending_phone", "+201012345678");
  assert.equal(await session.getPendingOtpPhone(), null);
  const form = new FormData(); form.set("locale", "en");
  const route = await load("src/features/auth/actions/logout-account").logoutAccount(form);
  assert.equal(route.href, "/login");
  assert.equal(writes.at(-1).options.maxAge, 0);
  assert.equal(writes.at(-2).options.maxAge, 0);
});

test("Auth guard considers token and backend user with null email authenticated", async () => {
  const load = createLoader({
    "server-only": {},
    react: { cache: (fn) => fn },
    "next-intl/server": { getLocale: async () => "en" },
    "@/features/auth/server/auth-session": { getAccessToken: async () => "private-token" },
    "@/features/auth/api/auth-api.server": { getMeDto: async () => ({ success: true, data: user }) },
    "@/i18n/navigation": { redirect: () => assert.fail("must not redirect a valid session") },
  });
  const result = await load("src/features/auth/server/auth-boundary").requireUser("/account/orders");
  assert.equal(result.email, null);
  assert.equal(result.phone, phone);
});

function lifecycleHarness(locale) {
  const values = new Map(), writes = [], invalidations = [], requests = [];
  let current = { ...user }, pathname = `/${locale}/`, completeSucceeds = false;
  const translations = Object.assign((key) => key, { raw: () => ({}) });
  const shellModules = [
    "@/components/shell/storefront/announcment-banner/AnnouncmentBanner",
    "@/components/shell/storefront/footer/Footer",
    "@/components/shell/storefront/header/Header",
    "@/components/shell/storefront/mobile-navigation/MobileBottomNavigation",
    "@/components/shell/storefront/quick-acess/QuickAccessHeader",
    "@/features/location/components/browsing-city-provider",
    "@/features/location/components/storefront-sync-veil",
  ];
  const load = createLoader({
    ...Object.fromEntries(shellModules.map((name) => [name, {}])),
    "server-only": {},
    react: { cache: (fn) => fn, Suspense: "suspense" },
    "next/cache": { revalidatePath: (...args) => invalidations.push(args) },
    "next/headers": {
      cookies: async () => ({
        get: (name) => ({ value: values.get(name) }),
        set: (name, value, options) => { values.set(name, value); writes.push({ name, value, options }); },
      }),
      headers: async () => new Headers({ "x-rafal-request-path": pathname }),
    },
    "next-intl": { hasLocale: (locales, value) => locales.includes(value) },
    "next-intl/server": { getLocale: async () => locale, getTranslations: async () => translations },
    "@/i18n/routing": { routing: { locales: ["ar", "en"] } },
    "@/i18n/navigation": { redirect: (route) => { throw Object.assign(new Error("redirect"), { route }); } },
    "@/features/location/server/resolve-current-location": { resolveCurrentLocation: async () => null },
    "@/features/categories/api/get-categories": { getCategoriesPage: async () => ({ items: [] }) },
    "@/features/categories/utils/category-navigation": { mapCategoryNavigation: () => [] },
    "@/features/cart/server/guest-cart-session": { getGuestCartToken: async () => "guest-cart" },
    "@/features/auth/components/CompleteProfileScreen": { CompleteProfileScreen: "complete-profile" },
    "@/features/auth/components/EmailEntryScreen": { EmailEntryScreen: "login" },
    "@/features/auth/components/OtpVerificationScreen": { OtpVerificationScreen: "otp" },
    "@/features/auth/components/PostAuthCartMergeRecovery": { PostAuthCartMergeRecovery: "merge-recovery" },
    "@/lib/api/server-api": { serverApi: { request: async (request) => {
      requests.push(request.path);
      if (request.path.endsWith("/request")) return { success: true, message: "ok" };
      if (request.path.endsWith("/verify")) return { ...envelope(current.profile_complete), data: { ...envelope(current.profile_complete).data, user: current } };
      if (request.path === "/auth/complete-profile" && completeSucceeds) {
        current = { ...current, first_name: "A", last_name: "B", profile_complete: true };
      }
      return { success: true, message: "ok", data: current };
    } } },
  }, { info() {}, error() {} });
  return {
    load, values, writes, invalidations, requests,
    setPath: (value) => { pathname = value; },
    complete: () => { completeSucceeds = true; },
    existingCustomer: () => { current = { ...current, profile_complete: true }; },
    storefront: () => load("src/app/[locale]/(storefront)/layout").default({ children: "page" }),
    page: (name, returnTo = "/checkout") => load(`src/app/[locale]/(auth)/${name}/page`).default({
      params: Promise.resolve({ locale }), searchParams: Promise.resolve({ returnTo }),
    }),
  };
}

test("locale proxy overwrites a forged destination and preserves localization without forwarding query secrets", () => {
  const { NextRequest } = require("next/server");
  const load = createLoader({
    "next-intl/middleware": { __esModule: true, default: () => (request) => request },
    "@/i18n/routing": { routing: { locales: ["ar", "en"] } },
  });
  for (const locale of ["ar", "en"]) {
    const request = new NextRequest(`https://store.test/${locale}/checkout?private=value`, {
      headers: { "x-rafal-request-path": "//evil.example" },
    });
    const forwarded = load("src/proxy").default(request);
    assert.equal(forwarded.headers.get("x-rafal-request-path"), `/${locale}/checkout`);
    assert.equal(forwarded.nextUrl.search, "?private=value");
  }
});

for (const locale of ["ar", "en"]) {
  test(`${locale}: real OTP/session/current-user/storefront lifecycle gates incomplete users until confirmed completion`, async () => {
    const h = lifecycleHarness(locale);
    // Guest Home and Checkout remain available, without a current-user request.
    for (const path of ["/", "/checkout"]) {
      h.setPath(`/${locale}${path}`);
      await h.storefront();
    }
    assert.equal(h.requests.length, 0);
    assert.equal((await h.page("login")).type, "login");
    await h.load("src/features/auth/actions/request-otp").requestOtp(input({ phone }), locale);
    const result = await h.load("src/features/auth/actions/verify-otp").verifyOtp(input({ code: "123456" }), locale);
    assert.equal(result.ok, true);
    assert.equal(result.profileComplete, false);
    assert.equal(h.values.get("rafal_auth_access_token"), "private-token");
    assert.equal(h.writes.find((entry) => entry.name === "rafal_auth_access_token").options.httpOnly, true);
    assert.equal((await h.page("register")).type, "complete-profile");
    for (const name of ["login", "login/verify", "auth/cart-recovery"]) {
      await assert.rejects(() => h.page(name), (error) => {
        assert.deepEqual(plain(error.route), { locale, href: { pathname: "/register", query: { returnTo: "/checkout" } } });
        return true;
      });
    }
    // Re-enter the actual server layout for direct, refresh, and history request sequences.
    // Browser Router Cache/BFCache itself remains manual QA; this is server execution.
    const paths = ["/", "/account/profile", "/account/orders", "/checkout", "/cart", "/account/profile", "/", "/checkout"];
    for (const path of paths) {
      h.setPath(`/${locale}${path}`);
      await assert.rejects(() => h.storefront(), (error) => {
        assert.deepEqual(plain(error.route), { locale, href: { pathname: "/register", query: { returnTo: path } } });
        return true;
      });
    }
    const complete = () => h.load("src/features/auth/actions/complete-profile").completeProfile(input({ firstName: "A", lastName: "B", termsAccepted: true }), locale);
    assert.equal((await complete()).ok, false);
    assert.deepEqual(h.invalidations, []);
    await assert.rejects(() => h.storefront(), (error) => error.route.href.pathname === "/register");
    h.complete();
    assert.equal((await complete()).ok, true);
    assert.deepEqual(h.invalidations, [["/", "layout"]]);
    for (const path of paths) { h.setPath(`/${locale}${path}`); await h.storefront(); }
    // Existing guest Cart recovery remains ahead of the safe intended destination.
    await assert.rejects(() => h.page("register"), (error) => {
      assert.deepEqual(plain(error.route), { locale, href: { pathname: "/auth/cart-recovery", query: { returnTo: "/checkout" } } });
      return true;
    });
    assert.equal(h.requests.some((path) => path.includes("cart")), false);
  });

  test(`${locale}: incomplete logout clears session, completed login and safe return destinations remain intact`, async () => {
    const h = lifecycleHarness(locale);
    const session = h.load("src/features/auth/server/auth-session");
    await session.setAccessToken("private-token");
    await session.setPendingOtpPhone(phone);
    for (const unsafe of ["https://evil.example", "//evil.example", "javascript:alert(1)"]) {
      await assert.rejects(() => h.page("login", unsafe), (error) => error.route.href.query.returnTo === "/");
    }
    const form = new FormData(); form.set("locale", locale);
    await assert.rejects(() => h.load("src/features/auth/actions/logout-account").logoutAccount(form), (error) => error.route.href === "/login");
    assert.equal(await session.getAccessToken(), null);
    assert.equal(await session.getPendingOtpPhone(), null);
    await h.storefront();
    h.existingCustomer();
    await session.setPendingOtpPhone(phone);
    const result = await h.load("src/features/auth/actions/verify-otp").verifyOtp(input({ code: "123456" }), locale);
    assert.equal(result.profileComplete, true);
    h.setPath(`/${locale}/checkout`);
    await h.storefront();
    await assert.rejects(() => h.page("login", "/account/orders"), (error) => error.route.href.query.returnTo === "/account/orders");
  });
}

