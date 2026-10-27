import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup, renderToPipeableStream } from "react-dom/server";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const source = (name) => readFileSync(path.join(root, name), "utf8");
const copy = (locale) => JSON.parse(source(`src/messages/${locale}/common.json`)).checkoutPage.payment;
const methods = ["tap", "card", "future", "bank_transfer", "apple_pay"].map((code) => ({ code, label: "<script>untrusted-label</script>", icon: "untrusted-icon" }));

function harness() {
  const state = { identity: { kind: "guest", token: "synthetic-private" }, methods, calls: [], error: null };
  const modules = new Map();
  function load(relative) {
    const base = path.join(root, relative);
    const filename = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find((file) => existsSync(file) && statSync(file).isFile());
    assert.ok(filename, relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loaded = { exports: {} }; modules.set(filename, loaded);
    const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    vm.runInNewContext(code, {
      module: loaded, exports: loaded.exports,
      require: (name) => {
        if (name === "server-only") return {};
        if (name === "@/features/cart/server/cart-auth-context") return { resolveCartTransportIdentity: async () => state.identity };
        if (name === "@/features/checkout/api/checkout-api.server") return { getCheckoutPaymentMethods: async (identity, locale) => {
          state.calls.push({ identity, locale });
          if (state.error) throw state.error;
          return state.methods;
        } };
        if (name.startsWith("@/")) return load(`src/${name.slice(2)}`);
        if (name.startsWith(".")) return load(path.relative(root, path.resolve(path.dirname(filename), name)));
        return require(name);
      },
    }, { filename });
    return loaded.exports;
  }
  return { load, state };
}
const h = harness();
const { CheckoutPaymentSection, CheckoutPaymentLoading, CheckoutPaymentRead } = h.load("src/features/checkout/components/checkout-payment-section");
const { canSelectCheckoutPayment, isCheckoutPaymentCode } = h.load("src/features/checkout/utils/checkout-payment-presentation");
const props = (locale = "en") => ({ copy: copy(locale), step: "4", selectedCode: "card", onSelect: () => {} });
const render = (discovery, locale = "en", selectedCode = "card") => renderToStaticMarkup(React.createElement(CheckoutPaymentSection, { ...props(locale), selectedCode, discovery }));

test("known discovered methods retain backend order; untrusted labels/icons and unknown codes are not rendered", () => {
  const html = render({ kind: "ready", methods });
  assert.ok(html.indexOf('value="tap"') < html.indexOf('value="card"'));
  assert.ok(html.indexOf('value="card"') < html.indexOf('value="apple_pay"'));
  assert.equal(html.includes('value="bank_transfer"'), false);
  assert.equal(html.includes('value="future"'), false);
  assert.equal(html.includes("untrusted"), false);
});

for (const locale of ["ar", "en"]) {
  test(`${locale} has localized labels, explicit inactive-method notice and native accessible radios`, () => {
    const html = render({ kind: "ready", methods }, locale);
    assert.ok(html.includes(copy(locale).title));
    assert.ok(html.includes(copy(locale).notice));
    for (const code of ["card", "apple_pay", "tap"]) assert.ok(html.includes(copy(locale).methods[code].label));
    assert.equal(html.includes(copy(locale).methods.bank_transfer.label), false);
    assert.match(html, /<fieldset aria-describedby=/);
    assert.match(html, /<legend class="sr-only">/);
    const radios = html.match(/<input[^>]+>/g);
    assert.equal(radios.length, 3);
    assert.equal(new Set(radios.map((input) => input.match(/name="([^"]+)"/)[1])).size, 1);
    for (const radio of radios) {
      assert.match(radio, /type="radio"/);
      assert.match(radio, /aria-describedby=/);
      if (radio.includes('value="card"')) {
        assert.match(radio, /checked=""/);
        assert.doesNotMatch(radio, /disabled=/);
      } else {
        assert.match(radio, /disabled=""/);
        assert.doesNotMatch(radio, /checked=/);
      }
    }
    assert.match(html, /focus-within:ring-2/);
    assert.doesNotMatch(html, /tabindex="-1"/);
  });
}

test("only existing card flow is selectable, including when an unsupported selected code is passed", () => {
  assert.equal(canSelectCheckoutPayment("card"), true);
  for (const code of ["tap", "apple_pay", "bank_transfer", "future"]) assert.equal(canSelectCheckoutPayment(code), false);
  assert.equal(isCheckoutPaymentCode("future"), false);
  const html = render({ kind: "ready", methods }, "en", "tap");
  assert.doesNotMatch(html, /checked=/);
  const withoutCard = render({ kind: "ready", methods: methods.filter((method) => method.code !== "card") });
  assert.doesNotMatch(withoutCard, /checked=/);
});

test("loading, failure, empty and unsupported-only states remain local and explicit", () => {
  const loading = renderToStaticMarkup(React.createElement(CheckoutPaymentLoading, props()));
  assert.match(loading, /role="status"/);
  assert.match(loading, /aria-busy="true"/);
  assert.ok(loading.includes(copy("en").loading));
  assert.ok(render({ kind: "unavailable" }).includes(copy("en").unavailable));
  for (const entries of [[], methods.filter((method) => method.code === "future")]) {
    const html = render({ kind: "ready", methods: entries });
    assert.ok(html.includes(copy("en").empty));
    assert.doesNotMatch(html, /type="radio"/);
  }
});

test("current server identity is used afresh for Guest and authenticated discovery without serializing credentials", async () => {
  const server = harness();
  const { readCurrentCheckoutPaymentMethods } = server.load("src/features/checkout/server/checkout-boundary");
  for (const identity of [{ kind: "guest", token: "synthetic-private" }, { kind: "authenticated", bearerToken: "synthetic-private" }]) {
    server.state.identity = identity;
    const result = await readCurrentCheckoutPaymentMethods("ar");
    assert.equal(result.kind, "ready");
    assert.equal(server.state.calls.at(-1).identity.kind, identity.kind);
    assert.equal(server.state.calls.at(-1).locale, "ar");
    assert.equal(JSON.stringify(result).includes("synthetic-private"), false);
  }
  server.state.identity = { kind: "guest", token: null };
  const count = server.state.calls.length;
  assert.equal((await readCurrentCheckoutPaymentMethods("en")).kind, "unavailable");
  assert.equal(server.state.calls.length, count);
});

test("discovery failure (including parser failure) and empty results do not reject the streamed promise", async () => {
  const server = harness();
  const { readCurrentCheckoutPaymentMethods } = server.load("src/features/checkout/server/checkout-boundary");
  server.state.error = new Error("private backend diagnostic");
  assert.equal(JSON.stringify(await readCurrentCheckoutPaymentMethods("en")), '{"kind":"unavailable"}');
  server.state.error = null; server.state.methods = [];
  const empty = await readCurrentCheckoutPaymentMethods("en");
  assert.equal(empty.kind, "ready");
  assert.equal(empty.methods.length, 0);
});

test("real React Suspense streams unrelated checkout content and loading before discovery resolves", async () => {
  let resolve;
  const discovery = new Promise((done) => { resolve = done; });
  const output = new PassThrough();
  let html = "";
  output.on("data", (chunk) => { html += chunk.toString(); });
  const finished = new Promise((done, reject) => { output.on("end", done); output.on("error", reject); });
  const shell = new Promise((done, reject) => {
    const stream = renderToPipeableStream(React.createElement("main", null,
      React.createElement("h1", null, "Checkout content"),
      React.createElement(React.Suspense, { fallback: React.createElement(CheckoutPaymentLoading, props()) },
        React.createElement(CheckoutPaymentRead, { ...props(), discovery }))), {
      onShellReady() { stream.pipe(output); done(); }, onError: reject,
    });
  });
  await shell;
  assert.ok(html.includes("Checkout content"));
  assert.ok(html.includes(copy("en").loading));
  resolve({ kind: "unavailable" });
  await finished;
  assert.ok(html.includes(copy("en").unavailable));
});

test("submission checks selection consistency and accepts only implemented identity-specific methods", () => {
  const page = source("src/features/checkout/components/checkout-page.tsx");
  const place = page.slice(page.indexOf("const placeRequest:"), page.indexOf("  return (", page.indexOf("const placeRequest:")));
  assert.match(place, /const paymentReady = canSubmitCheckoutPayment\(selectedPaymentCode, isAuthenticated, selectedPaymentDiscovery === paymentDiscovery\)/);
  assert.match(place, /!cityTransitionLocked &&\s*paymentReady &&/);
  assert.match(page, /if \(canSelectCheckoutPayment\(code, isAuthenticated, true\)\)/);
  const { serializeCheckoutPlaceRequest } = h.load("src/features/checkout/api/checkout-place-serializer");
  const { parseCheckoutPlaceRequest } = h.load("src/features/checkout/server/parse-checkout-place-request");
  const request = { destination: { kind: "saved-address", addressId: 1, cityId: 1 }, shippingMethodId: 1, buyer: { kind: "authenticated" } };
  assert.equal(serializeCheckoutPlaceRequest(request).payment_method, "card");
  assert.equal(parseCheckoutPlaceRequest({ ...request, paymentMethod: "tap" }).paymentMethod, "tap");
  assert.equal(parseCheckoutPlaceRequest({ ...request, paymentMethod: "bank_transfer" }), null);
  const route = source("src/app/[locale]/(storefront)/checkout/page.tsx");
  assert.match(route, /const paymentDiscovery = readCurrentCheckoutPaymentMethods\(locale\)/);
  assert.doesNotMatch(route, /await readCurrentCheckoutPaymentMethods/);
  assert.match(page, /<Suspense fallback={<CheckoutPaymentLoading/);
  assert.match(page, /dir={locale === "ar" \? "rtl" : "ltr"}/);
});
