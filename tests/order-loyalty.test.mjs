import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "next-intl";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
let locale = "en";
const messages = language => JSON.parse(readFileSync(`src/messages/${language}/account.json`, "utf8"));
const t = () => createTranslator({ locale, messages: messages(locale), namespace: "orders.details.loyalty" });
function load(relative) {
  const base = path.resolve(root, relative);
  const file = [base, base + ".ts", base + ".tsx"].find(existsSync);
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name => {
    if (name === "next-intl") return { useTranslations: t };
    if (name.startsWith("@/")) return load("src/" + name.slice(2));
    if (name.startsWith(".")) return load(path.resolve(path.dirname(file), name));
    return require(name);
  }, loaded, loaded.exports);
  return loaded.exports;
}
const { parseOrderDetailsResponse, parseGuestCompatibleOrderDetailsResponse } = load("src/features/orders/api/parse-orders-dto");
const { mapOrderDetails } = load("src/features/orders/api/orders-mapper");
const { OrderPaymentSummary } = load("src/features/orders/components/order-payment-summary");
const base = () => JSON.parse(readFileSync("tests/fixtures/payment-result-order.json", "utf8"));
function fixture(state) {
  const selected = JSON.parse(readFileSync(`src/docs/reference/loyalty/fixtures/order-${state}-selected-fields.json`, "utf8"));
  // Selected live fields complete a synthetic envelope; this is not a captured full response.
  return { success: true, data: { ...base().data, ...selected.data } };
}
const map = payload => mapOrderDetails(parseOrderDetailsResponse(payload));
function render(order) {
  return renderToStaticMarkup(React.createElement(OrderPaymentSummary, {
    locale, money: order.money, payment: order.payment, loyalty: order.loyalty,
    methodLabel: "Method", statusLabel: "Status", paidAtLabel: "Paid on",
    title: "Payment", totalLabel: "Gross total", methodLabels: {}, statusLabels: {},
  }));
}

test("legacy and guest orders retain absent/null loyalty without fabricated values", () => {
  for (const value of [undefined, null]) {
    const payload = base(); payload.data.loyalty = value;
    assert.equal(map(payload).loyalty, null);
    assert.equal(mapOrderDetails(parseGuestCompatibleOrderDetailsResponse(payload)).loyalty, null);
    assert.ok(!render(map(payload)).includes("Points redeemed"));
  }
  const payload = fixture("confirmed");
  payload.data.loyalty = { points_earned: null, earned_status: null, available_on: null };
  const loyalty = map(payload).loyalty;
  assert.equal(loyalty.amountApplied, null);
  assert.equal(loyalty.pointsEarned, null);
  for (const [key, value] of [["amount_applied", "bad"], ["points_earned", -1], ["available_on", "bad"]]) {
    const bad = fixture("confirmed"); bad.data.loyalty[key] = value;
    assert.throws(() => map(bad));
  }
});

test("lifecycle UI follows earned status, preserves gross/VAT and separates tender", () => {
  for (locale of ["ar", "en"]) for (const state of ["created", "confirmed", "processing", "shipped", "delivered", "returned"]) {
    const payload = fixture(state);
    payload.data.money.vat = { rate: "15", amount: "273.00" };
    const order = map(payload), html = render(order);
    assert.equal(order.money.total, "2093.00");
    assert.equal(order.money.vat.amount, "273.00");
    assert.equal(order.loyalty.amountApplied, "5.00");
    assert.equal(order.loyalty.amountDue, "2088.00");
    assert.equal(order.loyalty.pointsRedeemed, 100);
    for (const label of ["redeemed", "applied", "due"]) assert.ok(html.includes(t()(label)));
    const hasAvailability = html.includes(t()("availableOn"));
    assert.equal(hasAvailability, state === "delivered");
    if (state === "delivered") assert.ok(html.includes(`dateTime="${order.loyalty.availableOn}"`));
    if (state === "returned") {
      assert.equal(order.loyalty.earnedStatus, "cancelled");
      assert.equal(order.loyalty.pointsReturned, 100);
      assert.ok(!html.includes(order.loyalty.availableOn));
    }
    if (state === "created") assert.ok(!html.includes(t()("window", { days: "15" })));
  }
  locale = "en";
  assert.match(render(map(fixture("created"))), /Expected points/);
  assert.match(render(map(fixture("confirmed"))), /pending/);
  assert.match(render(map(fixture("confirmed"))), /15-day/);
  assert.match(render(map(fixture("delivered"))), /pending/);
  assert.match(render(map(fixture("returned"))), /cancelled/);
  assert.match(render(map(fixture("returned"))), /points returned to your balance/);
});

test("cancellation, unknown maturity, missing dates and zero-earned never imply unverified outcomes", () => {
  locale = "en";
  const payload = fixture("delivered");
  payload.data.status = "cancelled"; // Synthetic: cancellation contract is not captured.
  assert.match(render(map(payload)), /pending/);
  for (const status of ["available", "matured", "future_status"]) {
    payload.data.loyalty.earned_status = status;
    const html = render(map(payload));
    assert.match(html, /availability is not confirmed/);
    assert.ok(!html.includes(payload.data.loyalty.available_on));
  }
  payload.data.loyalty.earned_status = "pending";
  payload.data.loyalty.available_on = null;
  payload.data.loyalty.return_window_days = null;
  assert.ok(!render(map(payload)).includes("Available on"));
  payload.data.loyalty.points_earned = 0;
  payload.data.loyalty.points_returned = 100;
  const html = render(map(payload));
  assert.ok(!html.includes("Earned points"));
  assert.match(html, /points returned to your balance/);
  assert.ok(!html.includes("refund"));
});
