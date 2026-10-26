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
const fixture = (name) => JSON.parse(readFileSync(path.join(root, `tests/fixtures/checkout-payment-${name}.json`), "utf8"));
const plain = (value) => JSON.parse(JSON.stringify(value));
function harness() {
  const modules = new Map();
  const storage = new Map();
  const state = { payload: null, browserResult: null, confirmation: null, calls: [] };
  const forbidden = () => { throw new Error("Unexpected network access"); };
  function load(relative) {
    const base = path.join(root, relative);
    const filename = [base + ".ts", base + ".tsx"].find(existsSync);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loadedModule = { exports: {} };
    modules.set(filename, loadedModule);
    const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    vm.runInNewContext(code, {
      module: loadedModule, exports: loadedModule.exports, URL, URLSearchParams, Headers, FormData, Response,
      fetch: async () => Response.json(state.browserResult),
      sessionStorage: { setItem: (key, value) => storage.set(key, value), getItem: (key) => storage.get(key) ?? null },
      require: (name) => {
        if (name === "server-only") return {};
        if (name === "react") return { ...React, useState: () => [state.confirmation, () => {}], useEffect: () => {} };
        if (name === "@/i18n/navigation") return { Link: ({ children }) => React.createElement("a", null, children) };
        if (name === "@/components/ui/icons") return { CheckIcon: () => null };
        if (name === "@/components/ui/skeleton") return { Skeleton: () => null };
        if (name === "@/lib/api/server-api") return { serverApi: { request: async (request) => {
          state.calls.push(request); return state.payload;
        } } };
        if (name.startsWith("@/")) return load(`src/${name.slice(2)}`);
        if (name === "node:http" || name === "node:https") return forbidden();
        return require(name);
      },
    }, { filename });
    return loadedModule.exports;
  }
  return { load, state };
}

function paid(format) {
  const payload = fixture("paid");
  if (format === "nested") payload.data.money = fixture("pending").data.money;
  return payload;
}

for (const format of ["legacy", "nested"]) {
  test(`${format} VAT: runtime OTP Card fixture passes parser, normalizer, decision, server mapping, browser parsing and handoff`, async () => {
    const h = harness();
    const payload = fixture("otp-card");
    if (format === "nested") payload.data.money = fixture("pending").data.money;
    const { parseCheckoutPlaceResponse: parse } = h.load("src/features/checkout/api/parse-checkout-place-dto");
    const { normalizeCheckoutPayment: normalize } = h.load("src/features/checkout/api/normalize-checkout-payment");
    const { decideCheckoutPayment: decide } = h.load("src/features/checkout/utils/checkout-payment-decision");
    const outcome = normalize(parse(payload));
    assert.equal(outcome.kind, "verification-required");
    assert.equal(outcome.payment.status, "pending");
    assert.equal(outcome.payment.paidAt, null);
    assert.equal(decide(outcome).action, "verify-otp");
    h.state.payload = payload;
    const { placeCheckout } = h.load("src/features/checkout/api/checkout-api.server");
    const request = {
      destination: { kind: "saved-address", addressId: 1, cityId: 1 }, shippingMethodId: 2,
      buyer: { kind: "guest", name: "Test", email: "test@example.invalid", phone: "0501234567" },
    };
    h.state.browserResult = plain(await placeCheckout({ kind: "guest", token: "synthetic" }, "ar", request));
    const { placeCheckoutFromBrowser } = h.load("src/features/checkout/api/checkout-place-mutation");
    const result = await placeCheckoutFromBrowser("ar", request);
    assert.equal(result.kind, "verification-required");
    assert.equal(result.orderNumber, payload.data.order_number);
    assert.equal(result.money.total, payload.data.money.total);
    assert.equal(result.money.currency, payload.data.money.currency);
    if (format === "legacy") {
      assert.equal(result.money.vatAmount, payload.data.money.vat_amount);
      assert.equal("vat" in result.money, false);
    } else assert.deepEqual(plain(result.money.vat), payload.data.money.vat);
    const handoff = h.load("src/features/checkout/utils/checkout-handoff");
    assert.equal(handoff.storeCheckoutVerificationHandoff(result, request.buyer.phone), true);
    assert.equal(handoff.readCheckoutVerificationHandoff(result.orderNumber).phone, request.buyer.phone);
    assert.equal(handoff.readCheckoutConfirmationHandoff(result.orderNumber), null);
    assert.equal(h.state.calls.length, 1);
    assert.equal(h.state.calls[0].body.get("payment_method"), "card");
  });
}

test("pending Card OTP accepts existing new/metadata-required contract but rejects unsupported and contradictory combinations", () => {
  const h = harness();
  const { parseCheckoutPlaceResponse: parse } = h.load("src/features/checkout/api/parse-checkout-place-dto");
  const { normalizeCheckoutPayment: normalize } = h.load("src/features/checkout/api/normalize-checkout-payment");
  const { mapCheckoutPlaceResult: map } = h.load("src/features/checkout/api/checkout-place-mapper");
  const metadataOtp = fixture("otp-card");
  metadataOtp.data.status = "new";
  delete metadataOtp.data.requires_verification;
  metadataOtp.meta = { requires_verification: true };
  assert.equal(map(parse(metadataOtp)).kind, "verification-required");
  for (const change of [
    p => { p.data.payment.status = "paid"; p.data.payment.paid_at = p.data.placed_at; },
    p => { p.data.payment.paid_at = p.data.placed_at; },
    p => { p.meta = { requires_verification: false }; },
    p => { p.data.requires_verification = false; },
    p => { p.meta = fixture("pending").meta; },
    p => { p.data.payment.method = "tap"; },
    p => { p.data.payment.method = "apple_pay"; },
    p => { p.data.payment.method = "bank_transfer"; },
    p => { p.data.payment.method = "unknown"; },
    p => { p.data.payment.status = "unknown"; },
    p => { p.data.status = "confirmed"; },
    p => { p.data.status = "cancelled"; },
    p => { p.data.status = "new"; delete p.data.requires_verification; },
  ]) {
    const payload = fixture("otp-card"); change(payload);
    const parsed = parse(payload);
    assert.equal(normalize(parsed).kind, "unresolved");
    assert.throws(() => map(parsed));
  }
  for (const value of [undefined, "not-a-timestamp"]) {
    const payload = fixture("otp-card"); payload.data.payment.paid_at = value;
    assert.throws(() => parse(payload));
  }
});

for (const format of ["legacy", "nested"]) {
  test(`${format} VAT survives server Place, JSON, browser parser, handoff and confirmation without invented money`, async () => {
    const h = harness();
    h.state.payload = paid(format);
    const original = plain(h.state.payload);
    const { placeCheckout } = h.load("src/features/checkout/api/checkout-api.server");
    const mapped = await placeCheckout({ kind: "guest", token: "synthetic" }, "ar", {
      destination: { kind: "saved-address", addressId: 1, cityId: 1 }, shippingMethodId: 2,
      buyer: { kind: "guest", name: "Test", email: "test@example.invalid", phone: "0501234567" },
    });
    h.state.browserResult = plain(mapped);
    const { placeCheckoutFromBrowser } = h.load("src/features/checkout/api/checkout-place-mutation");
    const result = await placeCheckoutFromBrowser("ar", {});
    assert.equal(result.kind, "confirmed");
    const source = original.data.money;
    const expected = {
      subtotal: source.subtotal, discountTotal: source.discount_total, shippingFee: source.shipping_fee,
      personalizationTotal: source.personalization_total, giftWrapFee: source.gift_wrap_fee,
      total: source.total, currency: source.currency,
      ...(format === "legacy" ? { vatAmount: source.vat_amount } : { taxableAmount: source.taxable_amount, vat: source.vat }),
    };
    assert.deepEqual(plain(result.money), expected);
    assert.deepEqual(h.state.payload, original);
    assert.equal("requires_verification" in h.state.payload.data, false);
    assert.equal(h.state.calls.length, 1);
    assert.equal(h.state.calls[0].body.get("payment_method"), "card");
    const handoff = h.load("src/features/checkout/utils/checkout-handoff");
    assert.equal(handoff.storeCheckoutConfirmationHandoff(result), true);
    h.state.confirmation = handoff.readCheckoutConfirmationHandoff(result.orderNumber);
    assert.deepEqual(plain(h.state.confirmation.money), expected);
    const { CheckoutConfirmation } = h.load("src/features/checkout/components/checkout-confirmation");
    const html = renderToStaticMarkup(React.createElement(CheckoutConfirmation, { locale: "en", orderNumber: result.orderNumber, copy: {} }));
    assert.ok(html.includes(result.displayNumber));
    assert.ok(html.includes(new Intl.NumberFormat("en", { style: "currency", currency: source.currency }).format(Number(source.total))));
  });

  test(`${format} VAT supports OTP, legacy confirmation, and server/browser Verify`, async () => {
    const h = harness();
    const { parseCheckoutPlaceResponse: parse } = h.load("src/features/checkout/api/parse-checkout-place-dto");
    const { mapCheckoutPlaceResult: map } = h.load("src/features/checkout/api/checkout-place-mapper");
    const { parseCheckoutPlaceResult: parsePrivate } = h.load("src/features/checkout/api/parse-checkout-place-result");
    const otp = paid(format);
    delete otp.data.payment;
    otp.data.status = "pending_verification";
    otp.data.requires_verification = true;
    const result = parsePrivate(plain(map(parse(otp))));
    assert.equal(result.kind, "verification-required");
    const handoff = h.load("src/features/checkout/utils/checkout-handoff");
    assert.equal(handoff.storeCheckoutVerificationHandoff(result, "0501234567"), true);
    assert.equal(handoff.readCheckoutVerificationHandoff(result.orderNumber).phone, "0501234567");
    otp.data.status = "confirmed";
    otp.data.requires_verification = false;
    assert.equal(parsePrivate(plain(map(parse(otp)))).kind, "confirmed");
    h.state.payload = paid(format);
    const { verifyCheckoutOrder } = h.load("src/features/checkout/api/checkout-api.server");
    const request = { orderNumber: result.orderNumber, phone: "0501234567", otp: "123456" };
    h.state.browserResult = plain(await verifyCheckoutOrder("ar", request));
    const { verifyCheckoutOrderFromBrowser } = h.load("src/features/checkout/api/checkout-verify-mutation");
    assert.deepEqual(plain((await verifyCheckoutOrderFromBrowser("ar", request)).money), plain(result.money));
    h.state.browserResult = plain(result);
    await assert.rejects(verifyCheckoutOrderFromBrowser("ar", request), /confirmed order/);
  });
}

test("both boundaries reject mixed and incomplete VAT; Tap and contradictory payment stay blocked", () => {
  const h = harness();
  const { parseCheckoutPlaceResponse: parse } = h.load("src/features/checkout/api/parse-checkout-place-dto");
  const { mapCheckoutPlaceResult: map } = h.load("src/features/checkout/api/checkout-place-mapper");
  const { parseCheckoutPlaceResult: parsePrivate } = h.load("src/features/checkout/api/parse-checkout-place-result");
  for (const tax of [{}, { vat_amount: null }, { vat_amount: "1", taxable_amount: "2" }, { vat_amount: "1", vat: { rate: "15", amount: "1" } }, { vat: { amount: "1" }, taxable_amount: "2" }, { vat: { rate: "15", amount: "1" } }, { vat: { rate: "15" }, taxable_amount: "2" }]) {
    const payload = paid("legacy");
    delete payload.data.money.vat_amount;
    Object.assign(payload.data.money, tax);
    assert.throws(() => parse(payload));
    const result = plain(map(parse(paid("legacy"))));
    delete result.money.vatAmount;
    Object.assign(result.money, Object.fromEntries(Object.entries(tax).map(([key, value]) => [({ vat_amount: "vatAmount", taxable_amount: "taxableAmount" })[key] ?? key, value])));
    assert.throws(() => parsePrivate(result));
  }
  assert.throws(() => map(parse(fixture("pending"))), /supported by the existing Checkout flow/);
  for (const change of [p => { p.data.requires_verification = true; }, p => { p.data.payment.status = "unknown"; }, p => { p.data.payment.paid_at = null; }]) {
    const payload = paid("legacy"); change(payload);
    assert.throws(() => map(parse(payload)));
  }
});
