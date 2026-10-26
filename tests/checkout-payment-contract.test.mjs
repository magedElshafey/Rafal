import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const fixture = (name) => JSON.parse(readFileSync(path.join(root, `tests/fixtures/checkout-payment-${name}.json`), "utf8"));

function harness() {
  const calls = [];
  const state = { payload: fixture("methods"), deleted: 0 };
  const modules = new Map();
  const forbidden = () => { throw new Error("Unexpected logging, persistence or network access"); };
  function load(relative) {
    const filename = path.join(root, `${relative}.ts`);
    if (modules.has(filename)) return modules.get(filename);
    const loadedModule = { exports: {} };
    const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    } }).outputText;
    vm.runInNewContext(code, {
      module: loadedModule, exports: loadedModule.exports, URL, Headers, FormData, Request, Response,
      console: { log: forbidden, error: forbidden, warn: forbidden, info: forbidden, debug: forbidden },
      localStorage: { setItem: forbidden }, sessionStorage: { setItem: forbidden },
      fetch: forbidden,
      require: (name) => name === "server-only" ? {} : name === "next-intl" ? {
        hasLocale: (locales, locale) => locales.includes(locale),
      } : name === "@/i18n/routing" ? { routing: { locales: ["ar", "en"] } } : name === "@/features/cart/server/cart-auth-context" ? {
        resolveCartTransportIdentity: async () => ({ kind: "guest", token: "synthetic-guest" }),
      } : name === "@/features/cart/server/guest-cart-session" ? {
        deleteGuestCartToken: async () => { state.deleted += 1; },
      } : name === "@/lib/api/server-api" ? {
        serverApi: { request: async (request) => { calls.push(request); return state.payload; } },
      } : name.startsWith("@/") ? load(`src/${name.slice(2)}`) : require(name),
    }, { filename });
    modules.set(filename, loadedModule.exports);
    return loadedModule.exports;
  }
  return { load, calls, state };
}
const h = harness();
const { parseCheckoutPlaceResponse: parse } = h.load("src/features/checkout/api/parse-checkout-place-dto");
const { normalizeCheckoutPayment: normalize } = h.load("src/features/checkout/api/normalize-checkout-payment");
const { mapCheckoutPlaceResult: legacy } = h.load("src/features/checkout/api/checkout-place-mapper");
const { parseCheckoutPaymentMethodsResponse: methods } = h.load("src/features/checkout/api/parse-checkout-payment-methods-dto");
const outcome = (payload) => normalize(parse(payload));

test("discovery preserves backend codes/order including unknown methods; empty is explicit", () => {
  const payload = fixture("methods");
  payload.data.future_gateway = { label: "Future", icon: "unknown" };
  const result = methods(payload);
  assert.equal(Object.keys(result.data).join(","), "card,apple_pay,bank_transfer,tap,future_gateway");
  assert.equal(result.data.tap.label, payload.data.tap.label);
  assert.equal(Object.keys(methods({ ...payload, data: {} }).data).length, 0);
});

test("discovery rejects malformed envelopes and entries", () => {
  for (const data of [undefined, null, [], "methods", { tap: null }, { tap: { label: "", icon: "card" } }, { tap: { label: "Tap", icon: 1 } }]) {
    assert.throws(() => methods({ success: true, message: "", data }), /Invalid Checkout API payload/);
  }
});

test("server discovery uses existing identity headers, locale and cancellation without exposing credentials", async () => {
  const server = harness();
  const { getCheckoutPaymentMethods } = server.load("src/features/checkout/api/checkout-api.server");
  const signal = new AbortController().signal;
  for (const identity of [{ kind: "guest", token: "synthetic-guest" }, { kind: "authenticated", bearerToken: "synthetic-account" }]) {
    const result = await getCheckoutPaymentMethods(identity, "ar", signal);
    const call = server.calls.at(-1);
    assert.equal(call.path, "/checkout/payment-methods");
    assert.equal(call.method, "GET");
    assert.equal(call.locale, "ar");
    assert.equal(call.signal, signal);
    assert.equal(Object.keys(call.headers).join(), identity.kind === "guest" ? "X-Cart-Token" : "Authorization");
    assert.equal(result.map((method) => method.code).join(), "card,apple_pay,bank_transfer,tap");
    assert.equal(JSON.stringify(result).includes("synthetic-"), false);
  }
  server.state.payload.success = false;
  await assert.rejects(getCheckoutPaymentMethods({ kind: "guest", token: "synthetic" }, "en"), /unavailable/);
  server.state.payload = { success: true, message: "", data: {} };
  assert.equal((await getCheckoutPaymentMethods({ kind: "guest", token: "synthetic" }, "en")).length, 0);
});

test("supplied immediate paid shape preserves missing verification and legacy VAT without invention", () => {
  const result = outcome(fixture("paid"));
  assert.equal(result.kind, "paid");
  assert.equal(result.nextAction, "confirm");
  assert.equal(result.order.status, "confirmed");
  assert.equal(result.verification.required, null);
  assert.equal(result.money.format, "vat-amount");
  assert.equal(result.money.vatAmount, "18.26");
  assert.equal("taxableAmount" in result.money, false);
  assert.equal("handoff" in result, false);
  assert.equal(legacy(parse(fixture("paid"))).kind, "confirmed");
});

test("supplied Tap shape is pending, retains handoff only there, and cannot reach existing confirmation", () => {
  const payload = fixture("pending");
  const result = outcome(payload);
  assert.equal(result.kind, "hosted-payment-pending");
  assert.equal(result.nextAction, "hosted-payment");
  assert.equal(result.order.status, "new");
  assert.equal(result.payment.status, "pending");
  assert.equal(result.payment.paidAt, null);
  assert.equal(result.money.format, "nested-vat");
  // Boolean comparisons avoid printing handoff values in assertion diagnostics.
  assert.ok(result.handoff.paymentUrl === payload.meta.payment.payment_url);
  assert.ok(result.handoff.chargeId === payload.meta.payment.charge_id);
  assert.ok(result.handoff.expiresAt === payload.meta.payment.expires_at);
  assert.throws(() => legacy(parse(payload)), /supported by the existing Checkout flow/);
});

function oldOrder(status, verification) {
  const payload = fixture("pending");
  delete payload.data.payment;
  payload.meta = null;
  payload.data.status = status;
  payload.data.requires_verification = verification;
  return payload;
}

test("established OTP and non-payment confirmation remain compatible without claiming paid", () => {
  const otp = oldOrder("pending_verification", true);
  assert.equal(outcome(otp).kind, "verification-required");
  assert.equal(legacy(parse(otp)).kind, "verification-required");
  const confirmed = oldOrder("confirmed", false);
  assert.equal(outcome(confirmed).kind, "unresolved");
  assert.equal(legacy(parse(confirmed)).kind, "confirmed");
  const paid = fixture("pending");
  paid.meta = null;
  paid.data.status = "confirmed";
  paid.data.payment = fixture("paid").data.payment;
  assert.equal(legacy(parse(paid)).kind, "confirmed");
});

test("missing payment and unknown states cannot become paid or a new legacy confirmation", () => {
  for (const status of ["new", "cancelled", "unknown"]) {
    const payload = oldOrder(status, false);
    assert.equal(outcome(payload).kind, "unresolved");
    assert.throws(() => legacy(parse(payload)));
  }
  const payload = oldOrder("confirmed", false);
  delete payload.data.requires_verification;
  assert.equal(outcome(payload).kind, "unresolved");
  assert.throws(() => legacy(parse(payload)));
});

test("contradictory and unsupported states fail closed without carrying handoff URLs", () => {
  const changes = [
    (p) => { p.success = false; },
    (p) => { p.data.status = "confirmed"; },
    (p) => { p.data.payment.status = "paid"; },
    (p) => { p.data.requires_verification = true; },
    (p) => { p.meta.requires_verification = true; },
    (p) => { p.data.payment.paid_at = p.data.placed_at; },
    (p) => { p.data.payment.method = "future"; },
    (p) => { delete p.data.requires_verification; },
  ];
  for (const change of changes) {
    const payload = fixture("pending"); change(payload);
    const result = outcome(payload);
    assert.equal(result.kind, "unresolved");
    assert.equal("handoff" in result, false);
    assert.throws(() => legacy(parse(payload)));
  }
  const paid = fixture("paid"); paid.data.requires_verification = true;
  assert.equal(outcome(paid).kind, "unresolved");
});

test("missing or malformed handoff fails closed and errors never contain sensitive values", () => {
  const absent = fixture("pending"); delete absent.meta.payment;
  assert.equal(outcome(absent).reason, "missing-handoff");
  for (const field of ["payment_url", "charge_id", "expires_at"]) {
    const payload = fixture("pending"); delete payload.meta.payment[field];
    assert.throws(() => parse(payload), /Invalid Checkout API payload/);
  }
  for (const url of ["secret-sentinel", "javascript:secret-sentinel", "http://example.invalid/secret-sentinel", "https://user:secret-sentinel@example.invalid/"]) {
    const payload = fixture("pending"); payload.meta.payment.payment_url = url;
    assert.throws(() => parse(payload), (error) => {
      assert.equal(error.message.includes("secret-sentinel"), false);
      assert.equal(error.message.includes(url), false);
      return true;
    });
  }
  const payload = fixture("pending"); payload.meta.payment.expires_at = "invalid";
  assert.throws(() => parse(payload), /ISO timestamp/);
});

test("VAT variants are exclusive and incomplete payment records are rejected", () => {
  const payload = fixture("paid"); payload.data.money.vat = { rate: "15", amount: "18.26" };
  assert.throws(() => parse(payload), /one supported VAT representation/);
  const pending = fixture("pending"); delete pending.data.payment.paid_at;
  assert.throws(() => parse(pending));
});

test("paid requires matching confirmed order and populated paid timestamp; OTP flags cannot conflict", () => {
  const paid = fixture("paid");
  paid.data.payment.paid_at = null;
  assert.equal(outcome(paid).kind, "unresolved");
  paid.data.payment.paid_at = paid.data.placed_at;
  paid.data.status = "new";
  assert.equal(outcome(paid).kind, "unresolved");
  const otp = oldOrder("pending_verification", true);
  otp.meta = { requires_verification: false };
  assert.equal(outcome(otp).kind, "unresolved");
  assert.throws(() => legacy(parse(otp)));
  const unknown = oldOrder("cancelled", true);
  assert.equal(outcome(unknown).kind, "unresolved");
});

test("actual server Place compatibility boundary rejects pending and returns established OTP", async () => {
  const server = harness();
  const { placeCheckout } = server.load("src/features/checkout/api/checkout-api.server");
  const request = { destination: { kind: "saved-address", addressId: 1, cityId: 1 }, shippingMethodId: 1, buyer: { kind: "authenticated" } };
  const identity = { kind: "authenticated", bearerToken: "synthetic" };
  server.state.payload = fixture("pending");
  await assert.rejects(placeCheckout(identity, "en", request), /supported by the existing Checkout flow/);
  server.state.payload = oldOrder("pending_verification", true);
  assert.equal((await placeCheckout(identity, "en", request)).kind, "verification-required");
  assert.equal(server.calls.at(-1).body.get("payment_method"), "card");
});

test("private route does not expose a new pending branch or delete the Guest cookie; established OTP still cleans up", async () => {
  const server = harness();
  const route = server.load("src/app/api/checkout/place/route");
  const request = () => new Request("https://store.example.invalid/api/checkout/place?locale=en", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      destination: { kind: "one-time-address", address: { recipientName: "Test", recipientPhone: "0501234567", cityId: 1, district: "Test", streetDetails: "Test" } },
      shippingMethodId: 1,
      buyer: { kind: "guest", name: "Test", email: "qa@example.invalid", phone: "0501234567" },
    }),
  });
  server.state.payload = fixture("pending");
  const blocked = await route.POST(request());
  assert.equal(blocked.status, 503);
  assert.equal(server.state.deleted, 0);
  const body = await blocked.json();
  assert.equal(body.code, "service-unavailable");
  assert.equal(Object.keys(body).join(), "code");
  server.state.payload = oldOrder("pending_verification", true);
  const accepted = await route.POST(request());
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).kind, "verification-required");
  assert.equal(server.state.deleted, 1);
});
