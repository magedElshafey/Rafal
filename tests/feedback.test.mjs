import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
function loader(overrides = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    const absolute = path.resolve(root, file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const loaded = { exports: {} };
    cache.set(absolute, loaded);
    const { outputText } = ts.transpileModule(readFileSync(absolute, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    vm.runInNewContext(outputText, {
      module: loaded, exports: loaded.exports, URL, AbortSignal, DOMException, FormData, Headers,
      ...globals,
      require(specifier) {
        if (specifier in overrides) return overrides[specifier];
        if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return require(specifier);
        const base = specifier.startsWith("@/") ? path.join(root, "src", specifier.slice(2)) : path.resolve(path.dirname(absolute), specifier);
        const resolved = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(existsSync);
        assert.ok(resolved, specifier);
        return load(resolved);
      },
    }, { filename: absolute });
    return loaded.exports;
  }
  return load;
}

function leaves(value, prefix = "", result = {}) {
  for (const [key, child] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") result[name] = child;
    else leaves(child, name, result);
  }
  return result;
}

test("Arabic and English have matching keys and interpolation variables across every namespace", () => {
  for (const file of readdirSync("src/messages/en")) {
    const en = leaves(JSON.parse(readFileSync(`src/messages/en/${file}`, "utf8")));
    const ar = leaves(JSON.parse(readFileSync(`src/messages/ar/${file}`, "utf8")));
    assert.deepEqual(Object.keys(ar).sort(), Object.keys(en).sort(), file);
    for (const key of Object.keys(en)) {
      const parameters = (value) => [...value.matchAll(/\{(\w+)(?:\}|,)/g)].map((match) => match[1]).sort();
      assert.deepEqual(parameters(ar[key]), parameters(en[key]), `${file}:${key}`);
      assert.ok(ar[key].trim() && en[key].trim(), `${file}:${key} is non-empty`);
    }
  }
});

test("feedback reserves localized alternatives without duplicate accessible errors or clipping", () => {
  const { FieldFeedback } = loader()("src/components/ui/field.tsx");
  for (const message of ["Enter a valid Saudi mobile number.", "يرجى إدخال رقم جوال سعودي صحيح."]) {
    const reserve = [message];
    const empty = renderToStaticMarkup(h(FieldFeedback, { id: "error", reserve, role: "alert" }));
    const shown = renderToStaticMarkup(h(FieldFeedback, { id: "error", reserve, role: "alert" }, message));
    assert.match(empty, /aria-hidden="true"[^>]*class="invisible/);
    assert.doesNotMatch(empty, /aria-live="polite"/);
    assert.match(empty, /role="alert"/);
    assert.match(shown, /role="alert"[^>]*id="error"|id="error"[^>]*role="alert"/);
    assert.equal((shown.match(/aria-hidden="true"/g) ?? []).length, 1);
    assert.doesNotMatch(shown, /truncate|line-clamp|overflow-hidden|height:/);
  }
});

test("malformed transport envelopes never become untyped error codes; POST is not retried", async () => {
  for (const body of [null, [], { message: {}, code: 42 }, { message: "internal detail", code: "invalid-input", errors: { email: ["rejected"] } }]) {
    let calls = 0;
    const load = loader({}, { fetch: async () => { calls++; return new Response(JSON.stringify(body), { status: 422, headers: { "Content-Type": "application/json" } }); } });
    const { createHttpClient } = load("src/lib/api/http-client.ts");
    const { ApiError } = load("src/lib/api/api-error.ts");
    const api = createHttpClient({ baseUrl: new URL("https://example.invalid/api/") });
    await assert.rejects(api.request({ path: "/test", method: "POST", body: {} }), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 422);
      assert.equal(typeof error.message, "string");
      assert.ok(error.code === undefined || typeof error.code === "string");
      if (body?.errors) assert.deepEqual(JSON.parse(JSON.stringify(error.details)), body.errors);
      return true;
    });
    assert.equal(calls, 1);
  }
});

test("toast identity is explicit; independent identical text stays independent", () => {
  const calls = [];
  let nextId = 0;
  const toast = Object.fromEntries(["success", "error", "warning", "info", "dismiss"].map((kind) => [kind, (message, options) => {
    const id = options?.id ?? ++nextId;
    calls.push({ kind, message, options, id }); return id;
  }]));
  let locale = "en";
  const document = { documentElement: { lang: "en" } };
  const { rafalToast, useRafalToast: createScopedToast } = loader({ sonner: { toast }, "next-intl": { useLocale: () => locale } }, { document })("src/lib/rafal-toast.tsx");
  for (const kind of ["success", "error", "warning", "info"]) {
    assert.notEqual(rafalToast[kind]("Message"), rafalToast[kind]("Message"));
    assert.equal(calls.at(-1).options.duration, ["error", "warning"].includes(kind) ? 8000 : 5000);
    assert.equal(rafalToast[kind]("Message", { id: "operation-1" }), rafalToast[kind]("Updated", { id: "operation-1" }));
  }
  rafalToast.success("Message", { id: "order-1", duration: 9000 });
  assert.equal(calls.at(-1).options.duration, 9000);
  for (const initial of ["ar", "en"]) {
    locale = document.documentElement.lang = initial;
    const pending = createScopedToast();
    const before = calls.length;
    pending.success("same-locale completion");
    assert.equal(calls.length, before + 1);
    locale = document.documentElement.lang = initial === "ar" ? "en" : "ar";
    for (const kind of ["success", "error", "warning", "info"]) pending[kind]("stale completion");
    assert.equal(calls.length, before + 1);
    createScopedToast().success("current locale completion");
    assert.equal(calls.length, before + 2);
  }
});

test("sizing ignores React nodes, preventing hidden interactive controls and duplicate IDs", () => {
  const { FieldFeedback } = loader()("src/components/ui/field.tsx");
  const html = renderToStaticMarkup(h(FieldFeedback, { reserve: [h("button", { id: "unsafe" }, "Hidden button"), "Safe text"] }, h("span", { id: "visible" }, "Visible")));
  assert.doesNotMatch(html, /button|unsafe/);
  assert.equal((html.match(/id="visible"/g) ?? []).length, 1);
});

test("backend adapters enforce current locale on actual fetch headers for all methods and HeadersInit forms", async () => {
  const requests = [];
  const load = loader({
    "@/config/server-env": { serverEnv: { apiBaseUrl: new URL("https://backend.test/api/") } },
    "@/config/client-env": { clientEnv: { apiBaseUrl: new URL("https://backend.test/api/") } },
  }, { fetch: async (url, options) => { requests.push({ url, options }); return Response.json({ ok: true }); } });
  const { serverApi } = load("src/lib/api/server-api.ts");
  const { createClientApi } = load("src/lib/api/client-api.ts");
  for (const locale of ["ar", "en"]) {
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
      for (const headers of [
        { "X-Locale": "fr", "x-locale": "wrong", "ACCEPT-LANGUAGE": "wrong", Authorization: "Bearer test", "X-Cart-Token": "guest-test" },
        new Headers({ "x-locale": "wrong", Authorization: "Bearer test", "X-Cart-Token": "guest-test" }),
        [["X-Locale", "wrong"], ["x-locale", "wrong-again"], ["Authorization", "Bearer test"], ["X-Cart-Token", "guest-test"]],
      ]) {
        for (const api of [serverApi, createClientApi(locale)]) {
          const body = method === "GET" ? undefined : { value: 1 };
          await api.request({ path: "/test", locale, method, headers, body });
          const { url, options } = requests.at(-1);
          assert.equal(String(url), "https://backend.test/api/test");
          assert.equal(options.method, method);
          assert.equal(options.headers.get("X-Locale"), locale);
          assert.equal(options.headers.get("Accept-Language"), locale);
          assert.equal([...options.headers.keys()].filter(k => k === "x-locale").length, 1);
          assert.equal(options.headers.get("Authorization"), "Bearer test");
          assert.equal(options.headers.get("X-Cart-Token"), "guest-test");
          assert.equal(options.headers.get("Content-Type"), body === undefined ? null : "application/json");
          assert.equal(options.body, body ? JSON.stringify(body) : undefined);
        }
      }
    }
  }
  for (const locale of [undefined, "", "fr", "EN", "en,ar"]) {
    const before = requests.length;
    assert.throws(() => serverApi.request({ locale, path: "/test" }), /Unsupported API locale/);
    assert.throws(() => createClientApi(locale).request({ path: "/test" }), /Unsupported API locale/);
    assert.equal(requests.length, before);
  }
  const body = new FormData(); body.set("name", "test");
  await serverApi.request({ locale: "en", path: "/upload", method: "POST", body });
  assert.equal(requests.at(-1).options.headers.has("Content-Type"), false);
  assert.equal(requests.at(-1).options.body, body);
  for (const path of ["https://external.test/payment", "/https://external.test/payment", " https://external.test/payment", "//external.test/payment", "https:\\external.test"]) {
    assert.throws(() => serverApi.request({ locale: "en", path }), /relative endpoint/);
  }
  const { createHttpClient } = load("src/lib/api/http-client.ts");
  for (const base of ["https://store.test/api/", "https://external.test/"]) {
    await createHttpClient({ baseUrl: new URL(base) }).request({ path: "/test" });
    assert.equal(requests.at(-1).options.headers.has("X-Locale"), false);
  }
});

test("HTTP Content-Type defaults follow the body and preserve explicit caller headers", async () => {
  const requests = [];
  const load = loader({}, { fetch: async (url, options) => {
    requests.push(options);
    return Response.json({ ok: true });
  } });
  const { createHttpClient } = load("src/lib/api/http-client.ts");
  const api = createHttpClient({ baseUrl: new URL("https://backend.test/api/") });
  await api.request({ path: "/test" });
  assert.deepEqual([...requests.at(-1).headers], [["accept", "application/json"]]);
  assert.equal(requests.at(-1).body, undefined);
  assert.equal(requests.at(-1).credentials, undefined);
  for (const headers of [{ "Content-Type": "application/custom" }, new Headers({ "content-type": "application/custom" }), [["Content-Type", "application/custom"]]]) {
    await api.request({ path: "/test", method: "GET", headers });
    assert.equal(requests.at(-1).headers.get("Content-Type"), "application/custom");
  }
  const defaults = createHttpClient({ baseUrl: new URL("https://backend.test/api/"), getDefaultHeaders: async () => ({ "Content-Type": "application/default" }) });
  await defaults.request({ path: "/test" });
  assert.equal(requests.at(-1).headers.get("Content-Type"), "application/default");
  await defaults.request({ path: "/test", headers: { "Content-Type": "application/override" } });
  assert.equal(requests.at(-1).headers.get("Content-Type"), "application/override");
  for (const method of ["POST", "PUT", "PATCH"]) {
    for (const body of [{ value: 1 }, null, false, 0, ""]) {
      await api.request({ path: "/test", method, body });
      assert.equal(requests.at(-1).headers.get("Content-Type"), "application/json");
      assert.equal(requests.at(-1).body, JSON.stringify(body));
    }
    const form = new FormData(); form.set("field", "value");
    await api.request({ path: "/test", method, body: form });
    const options = requests.at(-1);
    assert.equal(options.body, form);
    assert.equal(options.headers.has("Content-Type"), false);
    const wireRequest = new Request("https://backend.test/api/test", options);
    assert.match(wireRequest.headers.get("Content-Type"), /^multipart\/form-data; boundary=.+/);
    assert.equal((await wireRequest.formData()).get("field"), "value");
  }
});


test("coupon clipboard completion uses current locale lifetime and an operation ID", async () => {
  let locale = "en";
  let complete;
  const calls = [];
  const document = { documentElement: { lang: locale } };
  const toast = { success: (...args) => calls.push(args), error: (...args) => calls.push(args) };
  const load = loader({
    react: { useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
    "next-intl": { useLocale: () => locale }, sonner: { toast },
    "@/components/ui/button": { Button: "button" }, "lucide-react": { Copy: () => null },
  }, { document, navigator: { clipboard: { writeText: () => new Promise(resolve => { complete = resolve; }) } } });
  const { CopyCouponButton } = load("src/features/offers/components/copy-coupon-button.tsx");
  const props = { code: "TEST", accessibleLabel: "Copy", copied: "Copied", failed: "Failed" };
  const english = CopyCouponButton(props);
  english.props.onClick();
  locale = document.documentElement.lang = "ar";
  complete(); await new Promise(setImmediate);
  assert.equal(calls.length, 0);
  const arabic = CopyCouponButton({ ...props, copied: "Current Arabic copy" });
  arabic.props.onClick(); complete(); await new Promise(setImmediate);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "Current Arabic copy");
  assert.equal(calls[0][1].id, "coupon-copy:TEST");
});
