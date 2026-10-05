import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const spinner = await import("@phosphor-icons/react/dist/ssr/CircleNotch");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const plain = (value) => JSON.parse(JSON.stringify(value));

function loader(overrides = {}, globals = {}) {
  const modules = new Map();
  function load(relative) {
    const base = path.join(root, relative);
    const filename = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(existsSync);
    assert.ok(filename, `Resolve ${relative}`);
    if (modules.has(filename)) return modules.get(filename).exports;
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    const loaded = { exports: {} };
    modules.set(filename, loaded);
    vm.runInNewContext(outputText, {
      AbortSignal, DOMException, FormData, Headers, Request, Response, URL, URLSearchParams,
      console, setTimeout, fetch: globalThis.fetch, ...globals,
      exports: loaded.exports, module: loaded,
      require(specifier) {
        if (specifier in overrides) return overrides[specifier];
        if (specifier === "server-only") return {};
        if (specifier === "@phosphor-icons/react/dist/ssr/CircleNotch") return spinner;
        if (specifier.startsWith("@/")) return load(`src/${specifier.slice(2)}`);
        if (specifier.startsWith(".")) return load(path.relative(root, path.resolve(path.dirname(filename), specifier)));
        return require(specifier);
      },
    }, { filename });
    return loaded.exports;
  }
  return load;
}

const load = loader();
const { validateContactMessage } = load("src/features/contact/utils/contact-message-contract");
const { normalizeSaudiMobile } = load("src/lib/phone/saudi-mobile");
const fields = ["name", "email", "phone", "subject", "message"];
const valid = { name: "نورة AlAli", email: "customer@example.test", phone: "+966501234567", subject: "سؤال Gift", message: "رسالة\nSecond LINE" };

test("Contact requires exactly five string fields and rejects unknown contract fields", () => {
  assert.deepEqual(plain(validateContactMessage(valid)), { ok: true, input: valid });
  for (const field of fields) {
    for (const value of [undefined, null, 42, {}, [], "", " \n\t "]) {
      const result = validateContactMessage({ ...valid, [field]: value });
      assert.equal(result.ok, false, `${field}: ${String(value)}`);
      assert.equal(result.fieldErrors[field], "invalid");
    }
    const missing = { ...valid };
    delete missing[field];
    assert.equal(validateContactMessage(missing).ok, false);
  }
  for (const value of [null, [], "text", 5, { ...valid, user_id: 1 }, { ...valid, locale: "en" }]) {
    assert.equal(validateContactMessage(value).ok, false);
  }
});

test("normalization trims boundaries, lowercases email, and preserves customer content", () => {
  const input = Object.fromEntries(fields.map((field) => [field, `  ${valid[field]}  `]));
  input.email = " Customer@Example.Test ";
  input.phone = " 050 123 4567 ";
  assert.deepEqual(plain(validateContactMessage(input)), { ok: true, input: valid });
  const long = "نص Mixed ".repeat(2000);
  assert.equal(validateContactMessage({ ...valid, subject: long, message: long }).ok, true);
});

test("email follows existing simple syntax and 254-character ceiling", () => {
  for (const email of ["a", "a@", "a@b", "a b@c.test", "a@@b.test", `${"a".repeat(250)}@b.test`]) {
    assert.equal(validateContactMessage({ ...valid, email }).fieldErrors.email, "invalid");
  }
});

test("shared Saudi phone normalization supports only established formats", () => {
  for (const phone of ["501234567", "0501234567", "+966501234567", "966501234567", "00966501234567", "(050) 123-4567"]) {
    assert.equal(normalizeSaudiMobile(phone), valid.phone);
    assert.equal(validateContactMessage({ ...valid, phone }).input.phone, valid.phone);
  }
  for (const phone of ["", "123", "+201012345678", "966401234567", "٠٥٠١٢٣٤٥٦٧", "05012345678", "050ABC4567"]) {
    assert.equal(normalizeSaudiMobile(phone), null);
    assert.equal(validateContactMessage({ ...valid, phone }).fieldErrors.phone, "invalid");
  }
});

function transportHarness(upstream) {
  const requests = [];
  const logs = [];
  let api;
  const source = loader({
    "@/lib/api/server-api": { serverApi: { request: (...args) => api.request(...args) } },
  }, {
    fetch: async (...args) => { requests.push(args); return upstream(...args); },
    console: { error: (...args) => logs.push(args), warn: (...args) => logs.push(args), log: (...args) => logs.push(args) },
  });
  api = source("src/lib/api/http-client").createHttpClient({ baseUrl: new URL("https://backend.test/api/") });
  return { POST: source("src/app/api/contact-messages/route").POST, requests, logs };
}

function request(body = valid, locale = "ar") {
  return new Request("https://store.test/api/contact-messages", {
    method: "POST", headers: { "Content-Type": "application/json", ...(locale ? { "Accept-Language": locale } : {}) },
    body: JSON.stringify(body),
  });
}

test("public BFF uses one multipart Laravel POST, exact fields and locale, no identity", async () => {
  const h = transportHarness(() => Response.json({ success: true, message: "PRIVATE", data: { id: 12, ...valid } }));
  for (const locale of ["ar", "en"]) {
    const response = await h.POST(request({ ...valid, phone: "0501234567" }, locale));
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    const [url, options] = h.requests.at(-1);
    assert.equal(String(url), "https://backend.test/api/contact-messages");
    assert.equal(options.method, "POST");
    assert.deepEqual(Object.fromEntries(options.body.entries()), valid);
    assert.deepEqual(Object.keys(options.headers).sort(), ["Accept", "Accept-Language"]);
    assert.equal(options.headers["Accept-Language"], locale);
    assert.ok(options.signal instanceof AbortSignal);
  }
  assert.equal(h.requests.length, 2);
  assert.deepEqual(h.logs, []);
});

test("BFF validates locale, JSON, types, and all fields before upstream submission", async () => {
  const h = transportHarness(() => { throw new Error("Must not send"); });
  for (const locale of [null, "fr", "ar,en", "EN"]) assert.equal((await h.POST(request(valid, locale))).status, 400);
  const malformed = new Request("https://store.test/api/contact-messages", { method: "POST", headers: { "Accept-Language": "ar" }, body: "{" });
  assert.equal((await h.POST(malformed)).status, 400);
  for (const field of fields) {
    const response = await h.POST(request({ ...valid, [field]: " " }));
    assert.equal(response.status, 422);
    assert.equal((await response.json()).errors[field], "invalid");
  }
  assert.equal((await h.POST(request({ ...valid, user_id: 1 }))).status, 422);
  assert.equal(h.requests.length, 0);
});

test("malformed/negative success envelopes and empty 2xx fail closed", async () => {
  for (const payload of [null, [], {}, { message: "Sent" }, { success: false }, { success: "true" }]) {
    const h = transportHarness(() => Response.json(payload));
    assert.equal((await h.POST(request())).status, 503);
    assert.equal(h.requests.length, 1);
  }
  const h = transportHarness(() => new Response(null, { status: 204 }));
  assert.equal((await h.POST(request())).status, 503);
});

test("rate, network, 422 and service failures are safe, private, and never retried", async () => {
  for (const status of [401, 403, 422, 429, 500, 503, 0]) {
    const h = transportHarness(() => {
      if (!status) throw new Error(JSON.stringify(valid));
      return Response.json({ message: JSON.stringify(valid), errors: { email: [valid.email] } }, { status });
    });
    const response = await h.POST(request());
    assert.equal(response.status, status === 429 ? 429 : 503);
    assert.deepEqual(await response.json(), { ok: false, code: status === 429 ? "rate-limited" : "service-failure" });
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.equal(h.requests.length, 1);
    assert.deepEqual(h.logs, []);
  }
});

function browserHarness(reply) {
  const requests = [];
  const source = loader({}, {
    window: { location: { origin: "https://store.test" } },
    fetch: async (...args) => { requests.push(args); return reply(...args); },
  });
  return { submit: source("src/features/contact/api/contact-messages-api.client").submitContactMessageFromBrowser, requests };
}

test("browser sends exactly five normalized JSON fields through shared HTTP transport", async () => {
  const h = browserHarness(() => Response.json({ ok: true }));
  assert.deepEqual(plain(await h.submit("en", { ...valid, email: " CUSTOMER@EXAMPLE.TEST " })), { ok: true });
  assert.equal(h.requests.length, 1);
  const [url, options] = h.requests[0];
  assert.equal(String(url), "https://store.test/api/contact-messages");
  assert.equal(options.method, "POST");
  assert.deepEqual(JSON.parse(options.body), valid);
  assert.deepEqual(plain(options.headers), { Accept: "application/json", "Content-Type": "application/json", "Accept-Language": "en" });
});

test("browser response parser rejects false success and sanitizes validation details", async () => {
  for (const payload of [{}, { ok: false }, { ok: "true" }, null]) {
    const h = browserHarness(() => Response.json(payload));
    assert.equal((await h.submit("en", valid)).code, "service-failure");
  }
  const h = browserHarness(() => Response.json({ code: "validation-error", errors: { email: "invalid", name: valid.name, user_id: "invalid" } }, { status: 422 }));
  assert.deepEqual(plain(await h.submit("en", valid)), { ok: false, code: "validation-error", fieldErrors: { email: "invalid" } });
  for (const status of [429, 500, 503, 0]) {
    const failed = browserHarness(() => { if (!status) throw new Error("offline"); return Response.json({ message: "PRIVATE" }, { status }); });
    assert.equal((await failed.submit("en", valid)).code, status === 429 ? "rate-limited" : "service-failure");
    assert.equal(failed.requests.length, 1);
  }
});

function copyFor(locale) {
  const form = JSON.parse(read(`src/messages/${locale}/content-pages.json`)).contact.form;
  return { ...form, errors: { "validation-error": form.errors.validation, "rate-limited": form.errors.rateLimited, "service-failure": form.errors.serviceFailure } };
}

test("both locales render five labeled required fields with shared Saudi phone semantics", () => {
  for (const locale of ["ar", "en"]) {
    const source = loader({ "next-intl": { useLocale: () => locale } });
    const { ContactForm } = source("src/features/content/components/ContactForm");
    const copy = copyFor(locale);
    const html = renderToStaticMarkup(React.createElement(ContactForm, { copy }));
    for (const field of fields) {
      assert.ok(copy.labels[field] && copy.validation[field]);
      assert.match(html, new RegExp(`<label[^>]*for="contact-${field}"`));
      const control = html.match(new RegExp(`<(?:input|textarea)[^>]*name="${field}"[^>]*>`))?.[0];
      assert.ok(control);
      assert.match(control, /required=""/);
    }
    assert.match(html, /autoComplete="tel-national"/);
    assert.match(html, /\+966/);
    assert.match(html, /type="email"/);
    const form = html.match(/<form[^>]*>/)?.[0];
    assert.match(form, /method="post"/);
    assert.match(form, /aria-describedby="contact-form-required"/);
    assert.match(html, /<textarea[^>]*id="contact-message"[^>]*rows="5"/);
    assert.match(html, /<button[^>]*type="submit"/);
    assert.match(html, /dir="auto"/);
    assert.doesNotMatch(html, /aria-invalid="true"/);
    for (const key of ["submit", "submitting", "required", "successTitle", "successBody", "sendAnother"]) assert.ok(copy[key]);
    for (const value of Object.values(copy.errors)) assert.ok(value);
  }
});

// Exercise the actual component handlers with a small hook harness, following
// this repository's Node/React tests. DOM focus/layout remain manual QA.
function formHarness(submit) {
  const slots = [];
  let cursor = 0;
  const source = loader({
    react: {
      ...React,
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [slots[index], (value) => { slots[index] = value; }];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
      useEffect() {},
    },
    "next-intl": { useLocale: () => "en" },
    "@/features/contact/api/contact-messages-api.client": { submitContactMessageFromBrowser: submit },
  }, {
    FormData: class { constructor(form) { this.values = form.values; } get(key) { return this.values[key]; } },
  });
  const { ContactForm } = source("src/features/content/components/ContactForm");
  const render = () => { cursor = 0; return ContactForm({ copy: copyFor("en") }); };
  return { render };
}

function find(element, predicate) {
  if (!React.isValidElement(element)) return null;
  if (predicate(element)) return element;
  for (const child of React.Children.toArray(element.props.children)) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
}

test("rapid duplicate submit makes one call, retains failure values, then confirms success and resets", async () => {
  const calls = [];
  let resolve;
  const h = formHarness((...args) => { calls.push(args); return new Promise((done) => { resolve = done; }); });
  const form = find(h.render(), (node) => node.type === "form");
  const event = { preventDefault() {}, currentTarget: { values: { ...valid } } };
  const first = form.props.onSubmit(event);
  await form.props.onSubmit(event);
  assert.equal(calls.length, 1);
  const pending = h.render();
  assert.equal(find(pending, (node) => node.props.type === "submit").props.loading, true);
  assert.equal(find(pending, (node) => node.type === "fieldset").props.disabled, true);
  resolve({ ok: false, code: "service-failure" });
  await first;
  const failed = h.render();
  const html = renderToStaticMarkup(failed);
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /aria-invalid="true"/);
  assert.deepEqual(event.currentTarget.values, valid);
  assert.equal(find(failed, (node) => node.type === "form").key, form.key);
  const next = find(failed, (node) => node.type === "form").props.onSubmit(event);
  resolve({ ok: true });
  await next;
  const success = h.render();
  assert.equal(find(success, (node) => node.type === "form"), null);
  assert.match(renderToStaticMarkup(success), /Message sent/);
  find(success, (node) => node.props.onClick)?.props.onClick();
  const reset = renderToStaticMarkup(h.render());
  assert.match(reset, /<form/);
  assert.doesNotMatch(reset, /role="alert"|aria-invalid="true"|value="[^"]+"/);
});

test("validation errors target only invalid controls and prevent requests", async () => {
  let calls = 0;
  const h = formHarness(() => { calls++; });
  await find(h.render(), (node) => node.type === "form").props.onSubmit({
    preventDefault() {}, currentTarget: { values: { ...valid, email: "wrong", message: " " } },
  });
  const html = renderToStaticMarkup(h.render());
  assert.equal(calls, 0);
  assert.equal((html.match(/aria-invalid="true"/g) ?? []).length, 2);
  assert.match(html, /aria-describedby="contact-email-description"/);
  assert.match(html, /aria-describedby="contact-message-error"/);
  assert.doesNotMatch(html, /role="alert"/);
});

test("Contact restores the wider two-column composition with factual server-rendered support cards", async () => {
  for (const locale of ["ar", "en"]) {
    const messages = JSON.parse(read(`src/messages/${locale}/content-pages.json`)).contact;
    const source = loader({
      "next-intl/server": { getLocale: async () => locale, getTranslations: async () => (key) => key.split(".").reduce((value, part) => value[part], messages) },
      "@/lib/seo/alternates": { getLocalizedAlternates: () => ({}) },
      "next-intl": { useLocale: () => locale },
    });
    const page = await source("src/app/[locale]/(storefront)/contact/page").default();
    assert.equal(page.props.size, "default");
    assert.equal(page.props.className, "main-content-spacing");
    const [intro, grid] = page.props.children;
    assert.equal(intro.props.title, messages.title);
    assert.match(grid.props.className, /(?:^| )grid-cols-1(?: |$)/);
    assert.ok(grid.props.className.includes("md:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]"));
    const [form, sidebar] = grid.props.children;
    assert.equal(form.type, source("src/features/content/components/ContactForm").ContactForm);
    assert.equal(sidebar.type, "aside");
    assert.equal(sidebar.props.children.length, 2);
    const html = renderToStaticMarkup(page);
    assert.match(html, /max-w-5xl/);
    assert.match(html, /min-h-176/);
    assert.match(html, /border-gray-200 bg-gray-0 p-5 sm:p-7/);
    const supportHtml = renderToStaticMarkup(sidebar);
    assert.match(supportHtml, /rounded-lg bg-success p-6 text-gray-0/);
    assert.match(supportHtml, /rounded-lg border border-gray-200 bg-gray-0 p-6/);
    assert.equal((supportHtml.match(/<h2\b/g) ?? []).length, 2);
    assert.ok(supportHtml.includes(messages.support.title));
    assert.ok(supportHtml.includes(messages.help.description));
    assert.doesNotMatch(supportHtml, /<a\b|mailto:|tel:|@|\+966|\d{2}[:–-]\d{2}/);
    assert.equal(messages.info, undefined);
    assert.doesNotMatch(JSON.stringify(messages), /support@rafal|966 11|hoursValue|24–48|٢٤–٤٨/);
  }
  const source = read("src/app/[locale]/(storefront)/contact/page.tsx");
  assert.doesNotMatch(source, /use client|useEffect|useState|features\/(auth|cart)|fetch\(/);
});

test("localized public page and metadata preserve existing route and server boundary", async () => {
  for (const locale of ["ar", "en"]) {
    const messages = JSON.parse(read(`src/messages/${locale}/content-pages.json`)).contact;
    const source = loader({
      "next-intl/server": { getLocale: async () => locale, getTranslations: async () => (key) => key.split(".").reduce((value, part) => value[part], messages) },
      "@/lib/seo/alternates": { getLocalizedAlternates: (language, route) => ({ canonical: `/${language}${route}` }) },
      "next-intl": { useLocale: () => locale },
    });
    const page = source("src/app/[locale]/(storefront)/contact/page");
    const metadata = await page.generateMetadata();
    assert.equal(metadata.title, messages.title);
    assert.equal(metadata.description, messages.description);
    assert.equal(metadata.alternates.canonical, `/${locale}/contact`);
    assert.equal(metadata.robots, undefined);
    assert.match(renderToStaticMarkup(await page.default()), /<form/);
  }
  const page = read("src/app/[locale]/(storefront)/contact/page.tsx");
  assert.doesNotMatch(page, /use client|support@|966 11|hoursValue/);
  const source = [
    "src/features/content/components/ContactForm.tsx",
    "src/features/contact/api/contact-messages-api.client.ts",
    "src/features/contact/api/contact-messages-api.server.ts",
    "src/app/api/contact-messages/route.ts",
  ].map(read).join("\n");
  assert.doesNotMatch(source, /console\.|localStorage|sessionStorage|useQuery|useMutation|Authorization|X-Cart-Token|cookies\(|getCurrentUser|router\.refresh|revalidate/);
});
