import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const fixture = () => JSON.parse(readFileSync(path.join(root, "tests/fixtures/payment-result-order.json"), "utf8"));
const calls = [];
let reply = fixture(), token = "synthetic-auth", failure;
const storage = new Map();
const modules = new Map();
function load(relative) {
  const filename = [relative, `${relative}.ts`, `${relative}.tsx`].map(p => path.join(root, p)).find(existsSync);
  assert.ok(filename, relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const loaded = { exports: {} }; modules.set(filename, loaded);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports, URL, URLSearchParams, FormData, Headers,
    console: { error() { throw new Error("Unexpected sensitive diagnostic"); } },
    sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    fetch: async (...args) => { calls.push(args); if (failure) throw failure; return Response.json(reply); },
    require: name => {
      if (name === "server-only") return {};
      if (name === "@/features/auth/server/auth-session") return { getAccessToken: async () => token };
      if (name === "@/lib/api/server-api") return { serverApi: { request: async config => {
        calls.push(config); if (failure) throw failure; return reply;
      } } };
      return name.startsWith("@/") ? load(`src/${name.slice(2)}`) : require(name);
    },
  }, { filename });
  return loaded.exports;
}
const { parsePaymentReturn, resolvePaymentResult } = load("src/features/checkout/utils/payment-result");
const { readAuthenticatedPaymentResult } = load("src/features/checkout/server/payment-result");
const { lookupGuestOrder } = load("src/features/orders/server/guest-order-boundary");
const { readCheckoutVerificationHandoff } = load("src/features/checkout/utils/checkout-handoff");
const { lookupGuestOrderFromBrowser } = load("src/features/orders/api/guest-order-lookup");
const { mapOrderDetails } = load("src/features/orders/api/orders-mapper");
const { parseOrderDetailsResponse } = load("src/features/orders/api/parse-orders-dto");
const { ApiError } = load("src/lib/api/api-error");
const order = () => mapOrderDetails(parseOrderDetailsResponse(fixture()));
test.beforeEach(() => { calls.length = 0; reply = fixture(); token = "synthetic-auth"; failure = undefined; storage.clear(); });

test("exact return values; malformed, repeated, missing and unsafe parameters fail closed", () => {
  for (const status of ["success", "failed"]) assert.equal(parsePaymentReturn({ status, order_number: "RF-10103" }).status, status);
  for (const status of [undefined, "", "SUCCESS", "paid", "success ", ["success"], ["success", "failed"]]) {
    assert.equal(parsePaymentReturn({ status, order_number: "RF-10103" }), null);
  }
  for (const ref of [undefined, "", [], ["RF-10103"], "RF-10103\n", " RF-10103", "../RF-10103", "RF/10103", "RF%2F10103", "<script>", "RF?phone=123", "RF\u202e123", "a".repeat(101)]) {
    assert.equal(parsePaymentReturn({ status: "success", order_number: ref }), null);
  }
});

test("paid is authoritative without requiring paid_at; URL status is never proof", () => {
  const paid = order(); paid.payment.paidAt = null;
  assert.equal(resolvePaymentResult("RF-10103", paid).state, "confirmed");
  paid.payment.status = "pending";
  assert.equal(resolvePaymentResult("RF-10103", paid).state, "pending");
  paid.status = "payment_failed"; paid.payment.status = "failed";
  assert.equal(resolvePaymentResult("RF-10103", paid).state, "failed");
});

test("stale, contradictory and unknown snapshots remain pending", () => {
  for (const status of ["new", "pending_verification", "payment_failed", "cancelled", "returned", "unknown"]) {
    assert.equal(resolvePaymentResult("RF-10103", { ...order(), status }).state, "pending", status);
  }
  assert.equal(resolvePaymentResult("RF-10103", { ...order(), requiresVerification: true }).state, "pending");
  for (const status of ["failed", "pending", "unknown", "refunded", "PAID"]) {
    const value = order(); value.payment.status = status;
    assert.equal(resolvePaymentResult("RF-10103", value).state, "pending", status);
  }
});

test("authenticated read uses existing owned-order endpoint and returns only safe state", async () => {
  const result = await readAuthenticatedPaymentResult("ar", "RF-10103");
  assert.equal(result.state, "confirmed"); assert.equal(result.authorized, true);
  assert.equal(calls.length, 1); assert.equal(calls[0].path, "/orders/RF-10103");
  assert.equal(calls[0].locale, "ar"); assert.equal(calls[0].headers.Authorization, "Bearer synthetic-auth");
  assert.deepEqual(Object.keys(result).sort(), ["authorized", "state"]);
});

test("missing auth, forbidden, missing, mismatch, malformed and network failures never expose order details", async () => {
  token = null;
  assert.equal((await readAuthenticatedPaymentResult("en", "RF-10103")).authorized, false);
  assert.equal(calls.length, 0); token = "synthetic-auth";
  for (const status of [401, 403, 404, 429, 500]) {
    failure = new ApiError({ status, message: "private upstream error" });
    assert.equal((await readAuthenticatedPaymentResult("en", "RF-10103")).state, "unavailable");
  }
  failure = new Error("network error");
  assert.equal((await readAuthenticatedPaymentResult("en", "RF-10103")).state, "unavailable");
  failure = undefined; reply.data.order_number = "RF-OTHER";
  assert.equal((await readAuthenticatedPaymentResult("en", "RF-10103")).authorized, false);
  reply = { success: true, data: {} };
  assert.equal((await readAuthenticatedPaymentResult("en", "RF-10103")).state, "unavailable");
});

test("guest saved handoff still requires backend lookup and exact response identity", async () => {
  const key = "rafal:checkout:verification:RF-10103";
  storage.set(key, JSON.stringify({ orderNumber: "RF-10103", displayNumber: "10103", phone: "+966501234567", verificationExpiresAt: "2020-01-01T00:00:00Z" }));
  const saved = readCheckoutVerificationHandoff("RF-10103");
  assert.ok(saved); // OTP expiry does not authorize or prevent a read-only ownership lookup.
  const value = await lookupGuestOrder("en", { orderNumber: saved.orderNumber, method: "phone", identity: saved.phone });
  assert.equal(resolvePaymentResult(saved.orderNumber, value).state, "confirmed");
  assert.equal(calls[0].path, "/orders/lookup"); assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].body.get("phone"), "+966501234567");
  assert.equal(calls[0].body.get("order_number"), "RF-10103");
  reply.data.order_number = "RF-OTHER";
  await assert.rejects(lookupGuestOrder("en", { orderNumber: "RF-10103", method: "phone", identity: saved.phone }), /identity/);
  storage.set(key, JSON.stringify({ ...saved, orderNumber: "RF-OTHER" }));
  assert.equal(readCheckoutVerificationHandoff("RF-10103"), null);
  storage.set(key, "malformed"); assert.equal(readCheckoutVerificationHandoff("RF-10103"), null);
});

test("guest browser lookup sends identity only in private POST body; cancellation and failure never retry", async () => {
  const controller = new AbortController();
  const input = { orderNumber: "RF-10103", method: "phone", identity: "+966501234567" };
  reply = { ok: true, order: order() };
  assert.equal((await lookupGuestOrderFromBrowser("ar", input, controller.signal)).ok, true);
  assert.equal(calls[0][0], "/api/orders/lookup");
  assert.equal(calls[0][1].signal, controller.signal);
  assert.equal(calls[0][1].cache, "no-store");
  assert.equal(calls[0][1].body, JSON.stringify(input));
  failure = new Error("Network failure");
  assert.equal((await lookupGuestOrderFromBrowser("ar", input)).ok, false);
  assert.equal(calls.length, 2);
});
