import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "next-intl";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const read = file => readFileSync(path.join(root, file), "utf8");
const selected = name => JSON.parse(read(`src/docs/reference/loyalty/fixtures/quote-${name}-selected-fields.json`));
let locale = "en";
const messages = () => JSON.parse(read(`src/messages/${locale}/common.json`));
const t = () => createTranslator({ locale, messages: messages(), namespace: "checkoutPage.loyalty" });
const calls = [];
let backend;
function load(relative) {
  const base = path.resolve(root, relative);
  const file = [base, base + ".ts", base + ".tsx", path.join(base, "index.ts")].find(f => existsSync(f) && statSync(f).isFile());
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const loaded = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name => {
    if (name === "server-only") return {};
    if (name.startsWith("@phosphor-icons/react")) return new Proxy({}, { get: () => () => null });
    if (name === "next-intl") return { useTranslations: t };
    if (name === "@/components/ui/icons") return { ChevronDownIcon: () => null };
    if (name === "@/lib/api/server-api") return { serverApi: { request: async request => { calls.push(request); return backend; } } };
    if (name === "@/i18n/navigation") return { Link: "a" };
    if (name === "@/components/ui/app-image") return { AppImage: () => null };
    if (name === "@/components/ui/variant-attribute-value") return { VariantAttributeValue: () => null };
    if (name.startsWith("@/")) return load("src/" + name.slice(2));
    if (name.startsWith(".")) return load(path.resolve(path.dirname(file), name));
    return require(name);
  }, loaded, loaded.exports);
  return loaded.exports;
}
const { parseCheckoutQuoteRequest } = load("src/features/checkout/server/parse-checkout-quote-request");
const { serializeCheckoutQuoteRequest } = load("src/features/checkout/api/checkout-serializer");
const { parseCheckoutQuoteResponse } = load("src/features/checkout/api/parse-checkout-dto");
const { mapCheckoutQuote } = load("src/features/checkout/api/checkout-mapper");
const { quoteCheckout } = load("src/features/checkout/api/checkout-api.server");
const { placeCheckout } = load("src/features/checkout/api/checkout-api.server");
const { parseCheckoutPlaceRequest } = load("src/features/checkout/server/parse-checkout-place-request");
const { parseCheckoutPlaceResult } = load("src/features/checkout/api/parse-checkout-place-result");
const { parseCheckoutConflictTotals } = load("src/features/checkout/api/parse-checkout-conflict-totals");
const { checkoutQuoteQueryOptions, checkoutQuoteQueryKey } = load("src/features/checkout/api/checkout-query");
const { CheckoutLoyalty } = load("src/features/checkout/components/checkout-loyalty");
const { CheckoutSummary } = load("src/features/checkout/components/checkout-summary");
const address = { recipientName: "Test", recipientPhone: "0501234567", cityId: 1, district: "District", streetDetails: "Street" };
const destinations = [{ kind: "saved-address", addressId: 1, cityId: 1 }, { kind: "one-time-address", address }, { kind: "gift-recipient", recipient: address }];
function fixture(name) {
  const payload = selected(name);
  // Synthetic envelope completes the supplied selected real fields.
  return { ...payload, data: {
    shipping_options: [], fulfillable: true, warehouse: null, unavailable_lines: [], coupon: null,
    location: { in_coverage: true, city: { id: 1, name: "Test" } },
    totals: { lines: [], items_count: 1, lines_count: 1, product_discount_total: "0.00", personalization_total: "0.00",
      coupon_discount: "0.00", gift_wrap_fee: "0.00", shipping_fee: "0.00",
      free_shipping: { enabled: false, threshold: null, qualifies: false, remaining: null }, ...payload.data.totals },
  } };
}
const map = data => mapCheckoutQuote(parseCheckoutQuoteResponse(data).data);

test("VAT display uses exact decimals and reconciles formatting without changing backend money", () => {
  const { vatInclusiveAmount, vatDisplayRounding } = load("src/lib/vat-presentation");
  assert.equal(vatInclusiveAmount("200.00", "15.00"), "230");
  assert.equal(vatInclusiveAmount("149.00", "15.00"), "171.35");
  assert.equal(vatInclusiveAmount("0.03", "15.00"), "0.0345");
  assert.equal(vatInclusiveAmount("200.00", "5.00"), "210");
  assert.equal(vatInclusiveAmount("200.00", "0.00"), "200");
  assert.equal(vatDisplayRounding("401.35", "15", "SAR", ["200", "149"], []), null);
  assert.equal(vatDisplayRounding("0.07", "15", "SAR", ["0.03", "0.03"], []), "0.01");
  assert.equal(vatDisplayRounding("0.11", "15", "SAR", ["0.05", "0.05"], []), "-0.01");
  assert.equal(vatDisplayRounding("100", "15", "SAR", ["100"], []), null);
});

test("AR/EN checkout renders inclusive subtotal, fees and discounts with unchanged VAT, total and amount due", () => {
  const { vatInclusiveAmount } = load("src/lib/vat-presentation");
  const cases = [
    { subtotal: "200", shippingFee: "149", total: "401.35", vatAmount: "52.35", expected: [230, 171.35] },
    { subtotal: "260", shippingFee: "15", total: "316.25", vatAmount: "41.25", expected: [299, 17.25] },
    { subtotal: "1200", shippingFee: "0", total: "1380", vatAmount: "180", expected: [1380, 0] },
    { subtotal: "460", shippingFee: "15", total: "546.25", vatAmount: "71.25", expected: [529, 17.25] },
    { subtotal: "400", shippingFee: "15", productDiscountTotal: "40", couponDiscount: "20", personalizationTotal: "10", giftWrapFee: "5", total: "425.50", vatAmount: "55.50", expected: [460, 17.25, 46, 23, 11.5, 5.75] },
    { subtotal: "0.03", shippingFee: "0.03", total: "0.07", vatAmount: "0.01", expected: [0.03, 0.01] },
  ];
  for (const currentLocale of ["ar", "en"]) for (const scenario of cases) {
    locale = currentLocale;
    const quote = map(fixture("funded_points_off"));
    Object.assign(quote.totals, { productDiscountTotal: "0", couponDiscount: "0", personalizationTotal: "0", giftWrapFee: "0", ...scenario,
      vat: { rate: "15", amount: scenario.vatAmount }, amountDue: scenario.total, loyalty: null });
    const before = JSON.stringify(quote);
    const html = renderToStaticMarkup(React.createElement(CheckoutSummary, {
      copy: messages().checkoutPage.summary, hasDestination: true, isLoading: false, locale, quote,
      items: [{ id: "1", productSlug: "test", name: "Test", quantity: 1, variantAttributes: [], lineTotal: { amount: vatInclusiveAmount("200", "15"), currency: "SAR" } }],
      loyaltyLabels: { applied: "Applied", due: "Amount due" },
    }));
    const format = value => new Intl.NumberFormat(locale, { style: "currency", currency: "SAR" }).format(Number(value));
    for (const value of [...scenario.expected, scenario.total, scenario.vatAmount, 230]) assert.ok(html.includes(format(value)), `${locale}: ${value}`);
    assert.ok(html.includes(messages().checkoutPage.summary.vat.replace("{rate}", "15")));
    assert.equal(html.includes(messages().checkoutPage.summary.rounding), scenario.total === "0.07");
    assert.equal(JSON.stringify(quote), before);
  }
});

test("shipping display taxes effective fee, respects free shipping and leaves option IDs/fees intact", () => {
  const { CheckoutShippingSection } = load("src/features/checkout/components/checkout-shipping-section");
  locale = "en";
  const quote = map(fixture("funded_points_off"));
  quote.shippingOptions = [
    { id: 2, name: "FedEx", price: "999", fee: "149", isFree: false },
    { id: 3, name: "Free", price: "149", fee: "0", isFree: true },
    { id: 4, name: "Fast", price: "99", fee: "15", isFree: false },
  ];
  const before = JSON.stringify(quote);
  const html = renderToStaticMarkup(React.createElement(CheckoutShippingSection, { copy: { title: "Shipping", free: "Free shipping" }, hasDestination: true, isError: false, isLoading: false, locale, quote, selectedShippingMethodId: 2, onSelect() {} }));
  for (const value of [171.35, 17.25]) assert.ok(html.includes(new Intl.NumberFormat("en", { style: "currency", currency: "SAR" }).format(value)));
  assert.ok(html.includes("Free shipping"));
  assert.equal(JSON.stringify(quote), before);
});

test("Place 0/1 reaches multipart for every address and preserves verified Loyalty through hosted browser parsing", async () => {
  for (const destination of destinations) for (const usePoints of [0, 1]) {
    backend = JSON.parse(read("tests/fixtures/checkout-place-hosted.json"));
    backend.data.payment.method = "tap";
    backend.data.loyalty = JSON.parse(read("src/docs/reference/loyalty/fixtures/order-created-selected-fields.json")).data.loyalty;
    if (!usePoints) Object.assign(backend.data.loyalty, { points_redeemed: 0, amount_applied: "0.00", amount_due: "2093.00" });
    const request = parseCheckoutPlaceRequest({ destination, shippingMethodId: 2, usePoints, buyer: { kind: "authenticated" }, paymentMethod: "tap" });
    assert.equal(request.usePoints, usePoints);
    const result = await placeCheckout({ kind: "authenticated", bearerToken: "synthetic" }, "en", request);
    assert.equal(calls.at(-1).body.get("use_points"), String(usePoints));
    assert.equal(calls.at(-1).path, "/checkout/place");
    const browser = parseCheckoutPlaceResult(JSON.parse(JSON.stringify(result)));
    assert.equal(browser.kind, "hosted-payment-required");
    assert.equal(browser.loyalty.points_redeemed, usePoints ? 100 : 0);
    assert.equal(browser.loyalty.amount_due, usePoints ? "2088.00" : "2093.00");
    assert.equal(browser.loyalty.earned_status, null);
  }
  for (const usePoints of [true, "1", 2, null]) assert.equal(parseCheckoutPlaceRequest({ destination: destinations[0], shippingMethodId: 1, usePoints, buyer: { kind: "authenticated" } }), null);
  const guest = { destination: destinations[1], shippingMethodId: 1, buyer: { kind: "guest", name: "Test", email: "test@example.com", phone: "0501234567" } };
  assert.equal(parseCheckoutPlaceRequest({ ...guest, usePoints: 1 }), null);
  assert.equal(parseCheckoutPlaceRequest({ ...guest, usePoints: 0 }).usePoints, 0);
});

test("conflict totals whitelist only validated authoritative financial fields", () => {
  const original = selected("place-409").errors.totals;
  const result = parseCheckoutConflictTotals({ ...original, secret: "PRIVATE", loyalty: { ...original.loyalty, secret: "PRIVATE" } });
  assert.equal(result.total, "2093.00");
  assert.equal(result.amount_due, "2088.00");
  assert.ok(!JSON.stringify(result).includes("PRIVATE"));
  assert.equal(parseCheckoutConflictTotals({ ...original, amount_due: "bad" }), null);
  assert.equal(parseCheckoutConflictTotals({ ...original, amount_due: "2093.00" }), null);
});

test("numeric 0/1 survive browser parsing and JSON-to-FormData for every destination", async () => {
  for (const destination of destinations) for (const usePoints of [0, 1]) {
    const request = parseCheckoutQuoteRequest({ destination, shippingMethodId: 2, usePoints });
    assert.equal(request.usePoints, usePoints);
    assert.equal(serializeCheckoutQuoteRequest(request).use_points, String(usePoints));
    backend = fixture(usePoints ? "funded_points_on" : "funded_points_off");
    const signal = new AbortController().signal;
    await quoteCheckout({ kind: "authenticated", bearerToken: "synthetic" }, "ar", request, signal);
    const call = calls.at(-1);
    assert.equal(call.body.get("use_points"), String(usePoints));
    assert.equal(call.body.get("shipping_method_id"), "2");
    assert.equal(call.signal, signal);
    assert.equal(call.path, "/checkout/quote");
  }
  for (const usePoints of ["1", true, -1, 2, null]) assert.equal(parseCheckoutQuoteRequest({ destination: destinations[0], usePoints }), null);
});

test("funded ON/OFF preserve backend gross/VAT and independent tender/due; missing money fails", () => {
  for (const intent of ["on", "off"]) {
    const quote = map(fixture(`funded_points_${intent}`));
    assert.equal(quote.totals.total, "2093.00");
    assert.equal(quote.totals.vat.amount, "273.00");
    assert.equal(quote.totals.loyalty.pointsUsed, intent === "on" ? 100 : 0);
    assert.equal(quote.totals.loyalty.amountApplied, intent === "on" ? "5.00" : "0.00");
    assert.equal(quote.totals.amountDue, intent === "on" ? "2088.00" : "2093.00");
  }
  for (const mutate of [p => delete p.data.totals.loyalty.amount_applied, p => p.data.totals.amount_due = "1.00", p => delete p.data.totals.amount_due]) {
    const p = fixture("funded_points_on"); mutate(p); assert.throws(() => map(p));
  }
});

test("guest quotes tolerate absent Loyalty and reject points ON before sending", async () => {
  backend = fixture("funded_points_off");
  delete backend.data.totals.loyalty; delete backend.data.totals.amount_due;
  assert.equal((await quoteCheckout({ kind: "guest", token: "synthetic" }, "en", { destination: destinations[1], usePoints: 0 })).totals.loyalty, null);
  const count = calls.length;
  await assert.rejects(quoteCheckout({ kind: "guest", token: "synthetic" }, "en", { destination: destinations[1], usePoints: 1 }));
  assert.equal(calls.length, count);
  await assert.rejects(quoteCheckout({ kind: "authenticated", bearerToken: "synthetic" }, "en", { destination: destinations[0], usePoints: 0 }));
});

test("AR/EN card renders backend eligibility, known/unknown reasons, loading and retry safely", () => {
  for (locale of ["ar", "en"]) {
    for (const name of ["funded_points_on", "funded_points_off", "zero_balance_points_on", "pending_order_points_on"]) {
      const loyalty = map(fixture(name)).totals.loyalty;
      const props = { locale, loyalty, checked: false, loading: false, locked: false, hasDestination: true, error: false, maxRedeemPercent: 50 };
      const html = renderToStaticMarkup(React.createElement(CheckoutLoyalty, props));
      assert.ok(html.includes('role="switch"'));
      assert.equal(html.includes('disabled=""'), loyalty.disabledReason !== null || loyalty.usable <= 0);
      if (loyalty.disabledReason) assert.ok(html.includes(t()(loyalty.disabledReason === "pending_order" ? "held" : "minimum")));
      const unknown = renderToStaticMarkup(React.createElement(CheckoutLoyalty, { ...props, loyalty: { ...loyalty, disabledReason: "unverified" } }));
      assert.ok(unknown.includes(t()("unavailable")) && !unknown.includes("unverified"));
      const loading = renderToStaticMarkup(React.createElement(CheckoutLoyalty, { ...props, loading: true, loyalty: null }));
      assert.ok(loading.includes('aria-busy="true"') && loading.includes('disabled=""'));
      const error = renderToStaticMarkup(React.createElement(CheckoutLoyalty, { ...props, loyalty: null, error: true }));
      const errorText = renderToStaticMarkup(React.createElement("p", null, t()("error")));
      assert.ok(error.includes(errorText) && error.includes(t()("retry")));
    }
    const quote = map(fixture("funded_points_on"));
    const html = renderToStaticMarkup(React.createElement(CheckoutSummary, { copy: messages().checkoutPage.summary, hasDestination: true, isLoading: false, items: [], locale, quote, loyaltyLabels: { applied: t()("tender"), due: t()("due") } }));
    assert.ok(html.indexOf(t()("tender")) > html.indexOf(messages().checkoutPage.summary.vat.split("{")[0]));
    for (const amount of [2093, 273, 5, 2088]) assert.ok(html.includes(new Intl.NumberFormat(locale, { style: "currency", currency: "SAR" }).format(amount)));
  }
});

test("query keys isolate points, shipping/address/gift; late responses cannot overwrite latest intent", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = (_url, init) => new Promise(resolve => requests.push({ init, resolve }));
  const off = { destination: destinations[0], usePoints: 0 };
  const on = { ...off, usePoints: 1 };
  const observer = new QueryObserver(client, checkoutQuoteQueryOptions("en", off));
  const stop = observer.subscribe(() => {});
  try {
    observer.setOptions(checkoutQuoteQueryOptions("en", on));
    assert.equal(requests.length, 2);
    assert.equal(requests[0].init.signal.aborted, true);
    requests[1].resolve(Response.json(map(fixture("funded_points_on"))));
    await new Promise(resolve => setImmediate(resolve));
    requests[0].resolve(Response.json(map(fixture("funded_points_off"))));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(observer.getCurrentResult().data.totals.loyalty.pointsUsed, 100);
    observer.setOptions(checkoutQuoteQueryOptions("en", off));
    assert.equal(requests.length, 3);
    assert.equal(observer.getCurrentResult().isFetching, true);
    requests[2].resolve(new Response("failure", { status: 503 }));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(observer.getCurrentResult().isError, true);
    const retry = observer.refetch();
    requests[3].resolve(Response.json(map(fixture("funded_points_off"))));
    await retry;
    assert.equal(observer.getCurrentResult().data.totals.loyalty.pointsUsed, 0);
    assert.equal(checkoutQuoteQueryOptions("en", off).staleTime, 0); // Cart/coupon return cannot reuse a fresh cached quote.
    const keys = destinations.flatMap(destination => [0, 1].flatMap(usePoints => [1, 2].map(shippingMethodId => JSON.stringify(checkoutQuoteQueryKey("en", { destination, usePoints, shippingMethodId })))));
    assert.equal(new Set(keys).size, 12);
  } finally { stop(); client.clear(); globalThis.fetch = original; }
});
