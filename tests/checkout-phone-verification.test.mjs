import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const fixture = name => JSON.parse(readFileSync(path.join(root, `tests/fixtures/checkout-payment-${name}.json`), "utf8"));
const phone = "00966 50 123 4567";
const tick = () => new Promise(resolve => setImmediate(resolve));

function harness(locale = "ar") {
  const modules = new Map(), storage = new Map(), scopes = new Map();
  const state = { upstream: [], browser: [], navigation: [], hostedNavigation: [], payload: fixture("paid"), status: null, storageFails: false, navigationFails: false };
  let scope, cursor;
  const marker = () => null;
  const OtpInput = () => null;
  const mutation = { reset() {}, isPending: false, mutateAsync: input => load("src/features/checkout/api/checkout-verify-mutation").verifyCheckoutOrderFromBrowser(locale, input) };
  function load(relative) {
    const base = path.join(root, relative);
    const filename = [base + ".ts", base + ".tsx"].find(existsSync);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loaded = { exports: {} }; modules.set(filename, loaded);
    const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    vm.runInNewContext(code, {
      module: loaded, exports: loaded.exports, URL, URLSearchParams, Headers, FormData, Request, Response,
      Error, Date, console: { error() { throw new Error("Unexpected logging"); }, info() { throw new Error("Unexpected logging"); } },
      window: { location: { assign: url => {
        if (state.navigationFails) throw new Error("Navigation unavailable");
        assert.ok(storage.has(`rafal:checkout:payment:${input.orderNumber}`));
        state.hostedNavigation.push(url);
      } }, setTimeout: fn => { fn(); return 1; }, clearTimeout() {}, setInterval: () => 1, clearInterval() {} },
      sessionStorage: {
        setItem(key, value) { if (state.storageFails) throw new Error("Storage unavailable"); storage.set(key, value); },
        getItem: key => storage.get(key) ?? null, removeItem: key => storage.delete(key),
      },
      fetch: async (url, init) => {
        state.browser.push({ url, init });
        const orderNumber = decodeURIComponent(url.split("/")[4]);
        return load("src/app/api/checkout/orders/[orderNumber]/verify/route").POST(new Request(`https://store.example.invalid${url}`, init), { params: Promise.resolve({ orderNumber }) });
      },
      require: name => {
        if (name === "server-only") return {};
        if (name === "next-intl") return { hasLocale: (locales, value) => locales.includes(value) };
        if (name === "@/i18n/routing") return { routing: { locales: ["ar", "en"] } };
        if (name === "react") return { ...React,
          useState(initial) { const index = cursor++; if (!(index in scope)) scope[index] = typeof initial === "function" ? initial() : initial;
            const current = scope; return [current[index], value => { current[index] = value; }]; },
          useRef(value) { const index = cursor++; return scope[index] ?? (scope[index] = { current: value }); },
          useEffect(fn) { const index = cursor++; if (!scope[index]) { scope[index] = true; fn(); } },
        };
        if (name === "@/features/checkout/hooks/use-checkout-verify") return { useCheckoutVerify: () => mutation };
        if (name === "@/features/auth/components/OtpInput") return { OtpInput };
        if (name === "@/components/ui/button") return { Button: marker };
        if (name === "@/components/ui/field") return { FieldFeedback: ({ children }) => React.createElement("p", null, children) };
        if (name === "@/components/ui/icons") return { InfoIcon: marker };
        if (name === "@/components/ui/skeleton") return { Skeleton: marker };
        if (name === "@/i18n/navigation") return { Link: marker, useRouter: () => ({ replace: url => {
          if (state.navigationFails) throw new Error("Navigation unavailable"); state.navigation.push(url);
        } }) };
        if (name === "@/features/cart/server/cart-auth-context") return { resolveCartTransportIdentity: () => { throw new Error("Verify must not resolve Cart identity"); } };
        if (name === "@/lib/api/server-api") return { serverApi: { request: async request => {
          state.upstream.push(request);
          if (state.status) {
            const { ApiError } = load("src/lib/api/api-error");
            throw new ApiError({ status: state.status, message: "Backend detail must stay private" });
          }
          return state.payload;
        } } };
        if (name.startsWith("@/")) return load(`src/${name.slice(2)}`);
        return require(name);
      },
    }, { filename });
    return loaded.exports;
  }
  const handoff = load("src/features/checkout/utils/checkout-handoff");
  const parsed = load("src/features/checkout/api/parse-checkout-place-dto").parseCheckoutPlaceResponse(fixture("otp-card"));
  const otpResult = load("src/features/checkout/api/checkout-place-mapper").mapCheckoutPlaceResult(parsed);
  state.payload.data.order_number = otpResult.orderNumber;
  const input = { orderNumber: otpResult.orderNumber, phone, otp: "123456" };
  const copy = JSON.parse(readFileSync(path.join(root, `src/messages/${locale}/common.json`), "utf8")).checkoutVerification;
  const { CheckoutVerificationHandoff } = load("src/features/checkout/components/checkout-verification-handoff");
  function render(key, fn, props) { scope = scopes.get(key) ?? []; scopes.set(key, scope); cursor = 0; return fn(props); }
  const page = () => render("page", CheckoutVerificationHandoff, { locale, orderNumber: input.orderNumber, copy });
  function find(tree, predicate) {
    if (!tree || typeof tree !== "object") return null;
    if (predicate(tree)) return tree;
    for (const child of React.Children.toArray(tree.props?.children)) { const found = find(child, predicate); if (found) return found; }
    return null;
  }
  function form() {
    const element = find(page(), el => el.type?.name === "CheckoutOrderVerificationForm");
    return render("form", element.type, element.props);
  }
  return { state, storage, load, handoff, otpResult, input, copy, page, form, find, OtpInput, remount: () => scopes.clear() };
}

const hostedFixture = () => JSON.parse(readFileSync(path.join(root, "tests/fixtures/checkout-verify-hosted.json"), "utf8"));

for (const locale of ["ar", "en"]) {
  for (const failure of [null, "storageFails", "navigationFails"]) {
    test(`${locale}: hosted Card handoff, ${failure ?? "success"}, preserves pending identity without repeating Verify`, async () => {
      const h = harness(locale);
      h.state.payload = hostedFixture();
      h.handoff.storeCheckoutVerificationHandoff(h.otpResult, phone);
      h.page();
      if (failure) h.state[failure] = true;
      const form = h.find(h.page(), el => el.type?.name === "CheckoutOrderVerificationForm");
      await Promise.all([form.props.onVerify(h.input), form.props.onVerify(h.input)]);
      assert.equal(h.state.upstream.length, 1);
      assert.equal(h.state.navigation.length, 0);
      assert.equal(h.handoff.readCheckoutConfirmationHandoff(h.input.orderNumber), null);
      assert.equal(h.find(h.page(), el => el.type?.name === "CheckoutOrderVerificationForm"), null);
      let button = h.find(h.page(), el => el.props.children === h.copy.continuePayment);
      if (failure) {
        assert.equal(h.state.hostedNavigation.length, 0);
        assert.equal(button.props.disabled, false);
        assert.ok(h.find(h.page(), el => el.props.children === h.copy.paymentHandoffFailed));
        h.state[failure] = false;
        button.props.onClick();
      }
      assert.equal(h.state.hostedNavigation.length, 1);
      assert.equal(h.state.hostedNavigation[0], h.state.payload.meta.payment.payment_url);
      assert.equal(h.handoff.readCheckoutPaymentHandoff(h.input.orderNumber).kind, "hosted-payment-required");
      button = h.find(h.page(), el => el.props.children === h.copy.continuePayment);
      assert.equal(button.props.disabled, true);
      button.props.onClick();
      assert.equal(h.state.hostedNavigation.length, 1);
      // Reload uses stored pending context, including when OTP context is no longer available.
      h.handoff.clearCheckoutVerificationHandoff(h.input.orderNumber);
      h.remount(); h.page();
      assert.equal(h.find(h.page(), el => el.type?.name === "CheckoutOrderVerificationForm"), null);
      h.find(h.page(), el => el.props.children === h.copy.continuePayment).props.onClick();
      assert.equal(h.state.upstream.length, 1);
    });
  }
}

test("expired stored handoff retains pending recovery and never re-verifies or redirects", () => {
  const h = harness();
  h.handoff.storeCheckoutPaymentHandoff({ kind: "hosted-payment-required", orderNumber: h.input.orderNumber,
    displayNumber: "Test", handoff: { paymentUrl: hostedFixture().meta.payment.payment_url, chargeId: "test", expiresAt: "2000-01-01T00:00:00Z" } });
  h.page();
  h.find(h.page(), el => el.props.children === h.copy.continuePayment).props.onClick();
  assert.equal(h.state.hostedNavigation.length, 0);
  assert.equal(h.state.upstream.length, 0);
  assert.ok(h.find(h.page(), el => el.props.children === h.copy.paymentHandoffFailed));
});

test("Verify hosted result validates server and browser contracts, rejecting unsafe or contradictory handoffs", async () => {
  for (const change of [
    p => { p.meta.payment.payment_url = "https://checkout.tap.company.evil.example/pay"; },
    p => { p.meta.payment.payment_url = "http://checkout.tap.company/pay"; },
    p => { p.meta.payment.payment_url = "https://user:password@checkout.tap.company/pay"; },
    p => { p.meta.payment.payment_url = "https://checkout.tap.company:444/pay"; },
    p => { delete p.meta.payment.payment_url; },
    p => { p.meta.payment.payment_url = "not-a-url"; },
    p => { delete p.meta.payment.charge_id; },
    p => { p.meta.payment.expires_at = "2000-01-01T00:00:00Z"; },
    p => { p.meta.requires_verification = true; },
    p => { delete p.meta.payment; },
    p => { delete p.meta.payment.expires_at; },
    p => { p.meta.payment.expires_at = "invalid"; },
    p => { p.meta.payment.charge_id = ""; },
    p => { p.success = false; },
    p => { p.data.order_number = "RF-OTHER-ORDER"; },
    p => { delete p.data.requires_verification; },
    p => { p.data.payment.status = "paid"; },
    p => { p.data.payment.paid_at = "2026-01-01T00:00:00Z"; },
    p => { p.data.payment.method = "unknown"; },
  ]) {
    const h = harness(); h.state.payload = hostedFixture(); change(h.state.payload);
    await assert.rejects(h.load("src/features/checkout/api/checkout-api.server").verifyCheckoutOrder("ar", h.input));
    assert.equal(h.state.upstream.length, 1);
  }
  const h = harness(); h.state.payload = hostedFixture();
  const result = await h.load("src/features/checkout/api/checkout-verify-mutation").verifyCheckoutOrderFromBrowser("ar", h.input);
  assert.equal(result.kind, "hosted-payment-required");
  assert.equal(result.orderNumber, h.input.orderNumber);
  assert.equal(result.handoff.paymentUrl, h.state.payload.meta.payment.payment_url);
  assert.equal(result.handoff.expiresAt, h.state.payload.meta.payment.expires_at);
  assert.equal(result.handoff.chargeId, h.state.payload.meta.payment.charge_id);
  assert.equal(h.state.browser.length, 1);
  assert.equal(h.state.upstream.length, 1);
  assert.equal(h.state.upstream[0].path, `/checkout/orders/${h.input.orderNumber}/verify`);
  const { parseCheckoutVerifyResult } = h.load("src/features/checkout/api/parse-checkout-verify-result");
  for (const handoff of [null, {}, { ...result.handoff, paymentUrl: "https://evil.example" },
    { ...result.handoff, paymentUrl: "http://checkout.tap.company" },
    { ...result.handoff, paymentUrl: "https://user@checkout.tap.company" },
    { ...result.handoff, expiresAt: "2000-01-01T00:00:00Z" }]) {
    assert.throws(() => parseCheckoutVerifyResult({ ...result, handoff }));
  }
});

test("Verify retains the earlier hosted flag variant and accepts consistent metadata flags", async () => {
  for (const required of [false, true]) {
    for (const metadataRequired of [undefined, required]) {
      const h = harness(); h.state.payload = hostedFixture();
      h.state.payload.data.requires_verification = required;
      if (metadataRequired !== undefined) h.state.payload.meta.requires_verification = metadataRequired;
      const result = await h.load("src/features/checkout/api/checkout-verify-mutation").verifyCheckoutOrderFromBrowser("ar", h.input);
      assert.equal(result.kind, "hosted-payment-required");
      assert.equal(result.orderNumber, h.input.orderNumber);
    }
  }
});

test("Verify confirms paid only with payment evidence; pending cannot become confirmation", async () => {
  const h = harness();
  const verify = h.load("src/features/checkout/api/checkout-api.server").verifyCheckoutOrder;
  const paid = structuredClone(h.state.payload);
  assert.equal((await verify("ar", h.input)).kind, "confirmed");
  for (const change of [
    p => { p.data.payment.status = "pending"; p.data.payment.paid_at = null; },
    p => { p.data.payment.paid_at = null; },
    p => { p.success = false; },
  ]) {
    h.state.payload = structuredClone(paid); change(h.state.payload);
    await assert.rejects(verify("ar", h.input));
  }
});

for (const locale of ["ar", "en"]) {
  test(`${locale}: exact phone survives storage, OTP form, private JSON and Laravel multipart Verify`, async () => {
    const h = harness(locale);
    assert.equal(h.handoff.storeCheckoutVerificationHandoff(h.otpResult, phone), true);
    assert.equal(h.handoff.readCheckoutVerificationHandoff(h.input.orderNumber).phone, phone);
    h.page();
    let form = h.form();
    assert.ok(renderToStaticMarkup(form).includes(phone));
    h.find(form, el => el.type === h.OtpInput).props.onValueChange(h.input.otp);
    form = h.form();
    const submit = h.find(form, el => el.type === "form").props.onSubmit;
    submit({ preventDefault() {} }); submit({ preventDefault() {} });
    await tick();
    assert.equal(h.state.browser.length, 1);
    const browser = h.state.browser[0];
    assert.equal(browser.url, `/api/checkout/orders/${h.input.orderNumber}/verify?locale=${locale}`);
    assert.equal(browser.init.method, "POST");
    assert.deepEqual(JSON.parse(browser.init.body), { phone, otp: h.input.otp });
    assert.equal(browser.init.headers["Content-Type"], "application/json");
    assert.equal(h.state.upstream.length, 1);
    const upstream = h.state.upstream[0];
    assert.equal(upstream.path, `/checkout/orders/${h.input.orderNumber}/verify`);
    assert.equal(upstream.method, "POST");
    assert.equal(upstream.locale, locale);
    assert.ok(upstream.body instanceof FormData);
    assert.deepEqual([...upstream.body.entries()], [["phone", phone], ["otp", h.input.otp]]);
    assert.equal(new Headers(upstream.headers).has("Content-Type"), false);
    assert.deepEqual(h.state.navigation, [`/orders/${h.input.orderNumber}/confirmation`]);
    assert.equal(h.handoff.readCheckoutVerificationHandoff(h.input.orderNumber), null);
    assert.ok(h.handoff.readCheckoutConfirmationHandoff(h.input.orderNumber));
    assert.doesNotMatch(h.copy.description, /email|البريد/);
  });

  test(`${locale}: invalid and expired backend OTP errors retain the phone handoff and show safe feedback`, async () => {
    for (const status of [422, 410]) {
      const h = harness(locale); h.state.status = status;
      h.handoff.storeCheckoutVerificationHandoff(h.otpResult, phone); h.page();
      const formElement = h.find(h.page(), el => el.type?.name === "CheckoutOrderVerificationForm");
      await formElement.props.onVerify(h.input);
      const next = h.find(h.page(), el => el.type?.name === "CheckoutOrderVerificationForm");
      assert.equal(next.props.error, h.copy.verificationFailed);
      assert.equal(h.state.navigation.length, 0);
      assert.equal(h.handoff.readCheckoutVerificationHandoff(h.input.orderNumber).phone, phone);
    }
  });
}

test("private Verify rejects absent/invalid phone, email fallback and invalid OTP before upstream", async () => {
  const h = harness();
  const route = h.load("src/app/api/checkout/orders/[orderNumber]/verify/route");
  for (const body of [{ otp: "123456" }, { email: "test@example.invalid", otp: "123456" },
    { phone, email: "test@example.invalid", otp: "123456" },
    ...[null, 123, "", "invalid", "12345", "+12025550123"].map(phone => ({ phone, otp: "123456" })),
    { phone, otp: "123" }, { phone, otp: "abcdef" }]) {
    const response = await route.POST(new Request("https://store.example.invalid/api/checkout/orders/test/verify?locale=ar", {
      method: "POST", body: JSON.stringify(body),
    }), { params: Promise.resolve({ orderNumber: "test" }) });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { code: "verification-failed" });
  }
  assert.equal(h.state.upstream.length, 0);
});

test("old email-only storage and invalid phone storage are unusable; write failure reports false", () => {
  const h = harness();
  const key = `rafal:checkout:verification:${h.input.orderNumber}`;
  for (const identity of [{ email: "test@example.invalid" }, { phone: "invalid" }]) {
    h.storage.set(key, JSON.stringify({ orderNumber: h.input.orderNumber, displayNumber: "Test", verificationExpiresAt: null, ...identity }));
    assert.equal(h.handoff.readCheckoutVerificationHandoff(h.input.orderNumber), null);
  }
  h.state.storageFails = true;
  assert.equal(h.handoff.storeCheckoutVerificationHandoff(h.otpResult, phone), false);
});

test("invalid or locally expired OTP cannot call Verify", () => {
  for (const expired of [false, true]) {
    const h = harness();
    h.handoff.storeCheckoutVerificationHandoff({ ...h.otpResult, verificationExpiresAt: expired ? "2000-01-01T00:00:00Z" : null }, phone);
    h.page(); let form = h.form();
    h.find(form, el => el.type === h.OtpInput).props.onValueChange(expired ? "123456" : "123");
    form = h.form(); h.find(form, el => el.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(h.state.browser.length, 0);
  }
});

for (const failure of ["storageFails", "navigationFails"]) {
  test(`${failure}: retain OTP context and resume confirmed handoff without repeating Verify`, async () => {
    const h = harness();
    h.handoff.storeCheckoutVerificationHandoff(h.otpResult, phone); h.page();
    h.state[failure] = true;
    let form = h.find(h.page(), el => el.type?.name === "CheckoutOrderVerificationForm");
    await form.props.onVerify(h.input);
    assert.equal(h.state.navigation.length, 0);
    assert.ok(h.handoff.readCheckoutVerificationHandoff(h.input.orderNumber));
    assert.equal(h.state.upstream.length, 1);
    h.state[failure] = false;
    form = h.find(h.page(), el => el.type?.name === "CheckoutOrderVerificationForm");
    await form.props.onVerify(h.input);
    assert.equal(h.state.upstream.length, 1);
    assert.deepEqual(h.state.navigation, [`/orders/${h.input.orderNumber}/confirmation`]);
  });
}
