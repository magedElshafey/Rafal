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
const calls = [];
let reply;
let failure;
const modules = new Map();
const forbidden = () => { throw new Error("Unexpected persistence or logging"); };
function load(relative) {
  const filename = path.join(root, `${relative}.ts`);
  if (modules.has(filename)) return modules.get(filename).exports;
  const loaded = { exports: {} }; modules.set(filename, loaded);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports, URL, URLSearchParams,
    console: { log: forbidden, error: forbidden, warn: forbidden },
    localStorage: { setItem: forbidden }, sessionStorage: { setItem: forbidden },
    fetch: async (...args) => { calls.push(args); if (failure) throw failure; return reply; },
    require: (name) => name.startsWith("@/") ? load(`src/${name.slice(2)}`) : require(name),
  }, { filename });
  return loaded.exports;
}
const { parseCheckoutPlaceResponse: parse } = load("src/features/checkout/api/parse-checkout-place-dto");
const { normalizeCheckoutPayment: normalize } = load("src/features/checkout/api/normalize-checkout-payment");
const { mapCheckoutPlaceResult: map } = load("src/features/checkout/api/checkout-place-mapper");
const { decideCheckoutPayment: decide } = load("src/features/checkout/utils/checkout-payment-decision");
const { parseCheckoutPlaceResult: parsePrivate } = load("src/features/checkout/api/parse-checkout-place-result");
const { isDefinitivePrePlaceRejection: definitive } = load("src/features/checkout/utils/checkout-place-attempt");
const { ApiError } = load("src/lib/api/api-error");
const { placeCheckoutFromBrowser } = load("src/features/checkout/api/checkout-place-mutation");
const request = { destination: { kind: "saved-address", addressId: 1, cityId: 1 }, shippingMethodId: 1, buyer: { kind: "authenticated" } };
function legacy(status, requiresVerification) {
  const payload = fixture("pending");
  payload.data.status = status;
  payload.data.requires_verification = requiresVerification;
  delete payload.data.payment;
  payload.meta = null;
  return payload;
}

test("decision distinguishes explicit paid, OTP, and legacy confirmation policy", () => {
  const paid = decide(normalize(parse(fixture("paid"))));
  assert.equal(paid.action, "confirm-paid");
  assert.equal(paid.order.status, "confirmed");
  assert.equal(paid.payment.status, "paid");
  assert.equal(decide(normalize(parse(legacy("pending_verification", true)))).action, "verify-otp");
  const confirmed = parse(legacy("confirmed", false));
  assert.equal(decide(normalize(confirmed)).action, "hold");
  assert.equal(map(confirmed).kind, "confirmed"); // Explicit existing compatibility only.
  const modernPaid = fixture("pending");
  modernPaid.meta = null;
  modernPaid.data.status = "confirmed";
  modernPaid.data.payment = fixture("paid").data.payment;
  assert.equal(parsePrivate(map(parse(modernPaid))).kind, "confirmed");
});

test("hosted preparation holds order and payment status independently, without exposing a redirect or handoff", () => {
  const decision = decide(normalize(parse(fixture("pending"))));
  assert.equal(decision.action, "hold");
  assert.equal(decision.reason, "hosted-payment-inactive");
  assert.equal(decision.order.status, "new");
  assert.equal(decision.payment.status, "pending");
  assert.equal(JSON.stringify(decision).includes("synthetic-test-only"), false);
  assert.equal("handoff" in decision, false);
  assert.throws(() => map(parse(fixture("pending"))), /supported by the existing Checkout flow/);
});

test("missing handoff and contradictory outcomes cannot complete or verify OTP", () => {
  for (const change of [
    (p) => { p.meta = null; },
    (p) => { p.data.status = "confirmed"; },
    (p) => { p.data.requires_verification = true; },
    (p) => { p.data.payment.status = "paid"; },
  ]) {
    const payload = fixture("pending"); change(payload);
    assert.equal(decide(normalize(parse(payload))).action, "hold");
    assert.throws(() => map(parse(payload)));
  }
});

test("browser accepts only complete established private results; malformed HTTP success is unknown", async () => {
  const valid = map(parse(legacy("pending_verification", true)));
  reply = Response.json(valid);
  assert.equal((await placeCheckoutFromBrowser("en", request)).kind, "verification-required");
  for (const payload of [null, {}, { ...valid, orderNumber: "" }, { ...valid, money: {} }, { ...valid, shippingAddress: null }, { ...valid, kind: "hosted-payment-pending" }]) {
    reply = Response.json(payload);
    const before = calls.length;
    await assert.rejects(placeCheckoutFromBrowser("en", request), (error) => {
      assert.equal(definitive(error), false); return true;
    });
    assert.equal(calls.length, before + 1);
  }
  reply = new Response("not JSON", { status: 200 });
  await assert.rejects(placeCheckoutFromBrowser("en", request));
});

test("network loss and backend failures are never evidence of no order creation, with no automatic retries", async () => {
  failure = new Error("Synthetic transport loss");
  let before = calls.length;
  await assert.rejects(placeCheckoutFromBrowser("en", request), (error) => !definitive(error));
  assert.equal(calls.length, before + 1);
  failure = null;
  for (const [status, code] of [[401, "unauthorized"], [409, "checkout-changed"], [422, "validation"], [503, "service-unavailable"]]) {
    reply = Response.json({ code }, { status }); before = calls.length;
    await assert.rejects(placeCheckoutFromBrowser("en", request), (error) => !definitive(error));
    assert.equal(calls.length, before + 1);
  }
});

test("only exact private preflight codes/statuses allow another explicit attempt", () => {
  for (const [status, code] of [[400, "invalid-input"], [400, "invalid-locale"], [409, "cart-session-unavailable"], [409, "identity-mismatch"]]) {
    assert.equal(definitive(new ApiError({ status, code, message: "Synthetic" })), true);
    assert.equal(definitive(new ApiError({ status: 503, code, message: "Synthetic" })), false);
  }
  assert.equal(definitive(new Error("identity-mismatch")), false);
});
