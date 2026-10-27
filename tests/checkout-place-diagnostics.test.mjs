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
const secret = "SENSITIVE_SENTINEL@example.invalid/token";
const fixture = name => JSON.parse(readFileSync(path.join(root, `tests/fixtures/checkout-payment-${name}.json`), "utf8"));

function harness(env = "development", scenario = "paid", changePayload = () => {}) {
  const modules = new Map();
  const logs = [];
  const state = { calls: 0, deleted: 0 };
  const payload = fixture(scenario === "pending" ? "pending" : "paid");
  payload.message = secret;
  payload.data.order_number = secret;
  payload.data.shipping_address.recipient_name = secret;
  if (scenario === "parsing") payload.data.money.total = secret;
  if (scenario === "identity-field") payload.data.id = secret;
  if (scenario === "rejected") payload.success = false;
  if (scenario === "otp") {
    delete payload.data.payment;
    payload.data.status = "pending_verification";
    payload.data.requires_verification = true;
  }
  changePayload(payload);
  function load(relative) {
    const filename = path.join(root, `${relative}.ts`);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loaded = { exports: {} }; modules.set(filename, loaded);
    const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    } }).outputText;
    vm.runInNewContext(code, {
      module: loaded, exports: loaded.exports, URL, URLSearchParams, Headers, FormData, Request,
      Error, TypeError, SyntaxError, DOMException, AbortSignal, setTimeout,
      process: { env: { NODE_ENV: env } },
      Response: { json: (body, init) => {
        if (scenario === "private" && body.kind) throw new TypeError(secret);
        return Response.json(body, init);
      } },
      console: { info: (...args) => logs.push(args), error: (...args) => logs.push(args) },
      fetch: async () => {
        state.calls++;
        if (scenario === "network") throw new TypeError(secret);
        if (scenario === "json") return new Response(secret, { status: 200, headers: { "Content-Type": "application/json" } });
        if (scenario === "http") return Response.json({ message: secret, errors: { secret } }, { status: 502 });
        return Response.json(payload);
      },
      require: name => {
        if (name === "server-only") return {};
        if (name === "next-intl") return { hasLocale: (locales, value) => locales.includes(value) };
        if (name === "@/i18n/routing") return { routing: { locales: ["ar", "en"] } };
        if (name === "@/config/server-env") return { serverEnv: { apiBaseUrl: new URL("https://backend.example.invalid/api/") } };
        if (name === "@/features/cart/server/cart-auth-context") return { resolveCartTransportIdentity: async () => {
          if (scenario === "identity") throw new Error(secret);
          return { kind: "guest", token: secret };
        } };
        if (name === "@/features/cart/server/guest-cart-session") return { deleteGuestCartToken: async () => {
          state.deleted++;
          if (scenario === "cleanup") throw new Error(secret);
        } };
        if (name === "@/features/checkout/api/normalize-checkout-payment" && scenario === "normalization") return {
          normalizeCheckoutPayment: () => { throw new Error(secret); },
        };
        if (name.startsWith(".")) return load(path.relative(root, path.resolve(path.dirname(filename), name)));
        return name.startsWith("@/") ? load(`src/${name.slice(2)}`) : require(name);
      },
    }, { filename });
    return loaded.exports;
  }
  async function run() {
    const response = await load("src/app/api/checkout/place/route").POST(new Request("https://store.example.invalid/api/checkout/place?locale=ar", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        destination: { kind: "saved-address", addressId: 1, cityId: 1 }, shippingMethodId: 2,
        buyer: { kind: "guest", name: "Test", email: "test@example.invalid", phone: "0501234567" },
      }),
    }));
    return { status: response.status, body: await response.json(), cache: response.headers.get("Cache-Control") };
  }
  async function runVerify() {
    const response = await load("src/app/api/checkout/orders/[orderNumber]/verify/route").POST(new Request("https://store.example.invalid/api/checkout/orders/test/verify?locale=ar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "0501234567", otp: "123456" }),
    }), { params: Promise.resolve({ orderNumber: secret }) });
    return { status: response.status, body: await response.json(), cache: response.headers.get("Cache-Control") };
  }
  return { load, logs, state, run, runVerify };
}

for (const [scenario, stage, status, upstream, errorName] of [
  ["network", "upstream-request", 502, undefined, "TypeError"],
  ["http", "upstream-response", 503, 502, "ApiError"],
  ["json", "upstream-response", 502, 200, "SyntaxError"],
  ["parsing", "response-parsing", 502, 200, "CheckoutContractError"],
  ["rejected", "response-parsing", 502, 200, "Error"],
  ["pending", "result-mapping", 502, 200, "CheckoutContractError"],
  ["otp", "confirmation-check", 502, 200, "Error"],
  ["paid", "confirmation-check", 200, 200, undefined],
]) {
  test(`Verify diagnostics: ${scenario} preserves response and isolates ${stage}`, async () => {
    const dev = harness("development", scenario);
    const result = await dev.runVerify();
    assert.equal(result.status, status);
    assert.equal(dev.state.calls, 1);
    assert.equal(dev.state.deleted, 0);
    for (const env of ["production", "test"]) {
      const quiet = harness(env, scenario);
      assert.deepEqual(await quiet.runVerify(), result);
      assert.equal(quiet.logs.length, 0);
    }
    assert.ok(dev.logs.every(([prefix]) => prefix === "[checkout:verify]"));
    const record = dev.logs.at(-1)[1];
    assert.equal(record.stage, stage);
    assert.equal(record.errorName, errorName);
    assert.equal(record.upstreamStatus, upstream);
    assert.equal(record.upstreamSuccessReceived, upstream === 200);
    if (status !== 200) {
      assert.equal(record.event, "failure");
      assert.deepEqual(result.body, { code: "verification-failed" });
    } else {
      assert.equal(result.body.kind, "confirmed");
      assert.deepEqual(dev.logs.map(([, data]) => data.stage), [
        "upstream-request", "upstream-response", "response-parsing", "result-mapping",
        "payment-normalization", "result-mapping", "result-mapping", "confirmation-check",
      ]);
    }
    if (scenario === "parsing") {
      assert.equal(record.contractPath, "response.data.money.total");
      assert.equal(record.expectedType, "a non-negative decimal string");
    }
    if (scenario === "pending") {
      assert.deepEqual(JSON.parse(JSON.stringify(record.paymentDecision)), {
        orderStatus: "new", paymentMethod: "tap", paymentStatus: "pending",
        paidAtPresent: false, requiresVerification: false,
        outcomeKind: "hosted-payment-pending", decisionAction: "hold", legacyConfirmation: false,
      });
      assert.deepEqual(record.paymentDecision, dev.logs.find(([, data]) => data.event === "payment-decision")[1].paymentDecision);
      assert.equal(record.contractPath, "response.data");
    }
    const output = JSON.stringify(dev.logs);
    for (const sensitive of [secret, "0501234567", "123456", "synthetic-test-only", "chg_EXAMPLE", fixture("paid").data.payment.paid_at]) {
      assert.equal(output.includes(sensitive), false);
    }
  });
}

test("successful Place emits all eight stages without sensitive values", async () => {
  const h = harness();
  const result = await h.run();
  assert.equal(result.status, 200);
  assert.equal(result.body.kind, "confirmed");
  assert.equal(h.state.calls, 1);
  assert.equal(h.state.deleted, 1);
  assert.deepEqual([...new Set(h.logs.map(([, data]) => data.stage))], [
    "identity-resolution", "upstream-request", "upstream-response", "response-parsing",
    "payment-normalization", "result-mapping", "guest-cookie-cleanup", "private-response",
  ]);
  assert.equal(h.logs.at(-1)[1].upstreamStatus, 200);
  assert.equal(h.logs.at(-1)[1].orderIdentifierParsed, true);
  assert.equal(JSON.stringify(h.logs).includes(secret), false);
});

test("Verify hosted handoff and destination failures never log payment URLs or tokens", async () => {
  const hosted = JSON.parse(readFileSync(path.join(root, "tests/fixtures/checkout-verify-hosted.json"), "utf8"));
  for (const invalid of [false, true]) {
    const change = payload => {
      Object.assign(payload, structuredClone(hosted));
      payload.data.order_number = secret; // Match runVerify's synthetic requested identity.
      if (invalid) payload.meta.payment.payment_url = "https://evil.example/?token=SYNTHETIC_PAYMENT_TOKEN";
    };
    const dev = harness("development", "paid", change);
    const prod = harness("production", "paid", change);
    const result = await dev.runVerify();
    assert.deepEqual(result, await prod.runVerify());
    assert.equal(result.status, invalid ? 502 : 200);
    assert.equal(dev.state.calls, 1);
    assert.equal(dev.state.deleted, 0);
    assert.equal(prod.logs.length, 0);
    if (invalid) {
      assert.equal(dev.logs.at(-1)[1].contractPath, "result.handoff.paymentUrl");
      assert.equal(dev.logs.at(-1)[1].expectedType, "an approved hosted payment URL");
    } else assert.equal(result.body.kind, "hosted-payment-required");
    const output = JSON.stringify(dev.logs);
    for (const sensitive of ["SYNTHETIC_PAYMENT_TOKEN", "chg_SYNTHETIC", "https://", hosted.data.order_number, "2099-01-01", secret]) {
      assert.equal(output.includes(sensitive), false);
    }
  }
});

for (const [scenario, stage, status, parsed, upstream] of [
  ["identity", "identity-resolution", 503, false, undefined],
  ["network", "upstream-request", 503, false, undefined],
  ["http", "upstream-response", 503, false, 502],
  ["json", "upstream-response", 503, false, 200],
  ["rejected", "upstream-response", 409, false, 200],
  ["identity-field", "response-parsing", 503, false, 200],
  ["parsing", "response-parsing", 503, true, 200],
  ["normalization", "payment-normalization", 503, true, 200],
  ["pending", "result-mapping", 503, true, 200],
  ["cleanup", "guest-cookie-cleanup", 200, true, 200],
  ["private", "private-response", 503, true, 200],
]) {
  test(`${scenario}: safe failure stage and unchanged public result in development and production`, async () => {
    const dev = harness("development", scenario);
    const prod = harness("production", scenario);
    const result = await dev.run();
    assert.deepEqual(result, await prod.run());
    assert.equal(result.status, status);
    if (status === 503) assert.deepEqual(result.body, { code: "service-unavailable" });
    if (status === 409) assert.deepEqual(result.body, { code: "checkout-changed" });
    assert.equal(result.cache, "private, no-store");
    assert.equal(prod.logs.length, 0);
    assert.equal(dev.state.calls, scenario === "identity" ? 0 : 1);
    const failure = dev.logs.find(([, data]) => data.event === "failure")[1];
    assert.equal(failure.stage, stage);
    assert.equal(failure.orderIdentifierParsed, parsed);
    assert.equal(failure.upstreamStatus, upstream);
    assert.equal(failure.upstreamSuccessReceived, upstream === 200);
    if (scenario === "parsing") {
      assert.equal(failure.contractPath, "response.data.money.total");
      assert.equal(failure.expectedType, "a non-negative decimal string");
    }
    const output = JSON.stringify(dev.logs);
    for (const sensitive of [secret, "synthetic-test-only", "chg_EXAMPLE", "RF-10373", "stack", "errorMessage"]) assert.equal(output.includes(sensitive), false);
  });
}

test("OTP success is unchanged and non-development diagnostics remain silent", async () => {
  const dev = harness("development", "otp"), prod = harness("production", "otp"), other = harness("test", "otp");
  const result = await dev.run();
  assert.equal(result.body.kind, "verification-required");
  assert.deepEqual(await prod.run(), result);
  assert.deepEqual(await other.run(), result);
  assert.equal(prod.logs.length + other.logs.length, 0);
});

test("arbitrary names and contract metadata are redacted; logging failures cannot escape", () => {
  const h = harness();
  const { createCheckoutPlaceDiagnostics } = h.load("src/features/checkout/server/checkout-place-diagnostics");
  const { CheckoutContractError } = h.load("src/features/checkout/api/parse-checkout-dto");
  const diagnostics = createCheckoutPlaceDiagnostics();
  const error = new CheckoutContractError(secret, secret);
  error.name = secret;
  diagnostics.failure(error);
  assert.equal(JSON.stringify(h.logs).includes(secret), false);
  assert.equal(h.logs[0][1].errorName, "UnknownError");
  assert.equal(h.logs[0][1].contractPath, "redacted");
  h.logs.push = () => { throw new Error(secret); };
  assert.doesNotThrow(() => diagnostics.failure(error));
  assert.doesNotThrow(() => diagnostics.stage("private-response"));
});

test("transport status observer cannot cause mutation retry or change a response", async () => {
  const h = harness();
  const { createHttpClient } = h.load("src/lib/api/http-client");
  const client = createHttpClient({ baseUrl: new URL("https://backend.example.invalid/") });
  const result = await client.request({ path: "/checkout/place", method: "POST", onResponseStatus: () => { throw new Error(secret); } });
  assert.equal(result.success, true);
  assert.equal(h.state.calls, 1);
});

const decisionCases = [
  ["runtime pending Card OTP", p => { Object.assign(p, fixture("otp-card")); }, "verification-required", "verify-otp", false, 200],
  ["valid paid with missing verification", () => {}, "paid", "confirm-paid", false, 200],
  ["valid paid with false verification", p => { p.data.requires_verification = false; }, "paid", "confirm-paid", false, 200],
  ["paid without timestamp", p => { p.data.payment.paid_at = null; }, "unresolved", "hold", false, 503],
  ["paid with required OTP", p => { p.data.requires_verification = true; }, "unresolved", "hold", false, 503],
  ["paid with metadata OTP", p => { p.meta.requires_verification = true; }, "unresolved", "hold", false, 503],
  ["conflicting verification flags", p => { p.data.requires_verification = false; p.meta.requires_verification = true; }, "unresolved", "hold", false, 503],
  ["paid with hosted handoff", p => { p.meta.payment = fixture("pending").meta.payment; }, "unresolved", "hold", false, 503],
  ["paid but new order", p => { p.data.status = "new"; }, "unresolved", "hold", false, 503],
  ["card pending", p => { p.data.status = "new"; p.data.requires_verification = false; p.data.payment.status = "pending"; p.data.payment.paid_at = null; }, "unresolved", "hold", false, 503],
  ["confirmed pending", p => { p.data.payment.status = "pending"; p.data.payment.paid_at = null; }, "unresolved", "hold", false, 503],
  ["nonpaid with timestamp", p => { p.data.payment.status = "pending"; }, "unresolved", "hold", false, 503],
  ["missing payment and verification", p => { delete p.data.payment; }, "unresolved", "hold", false, 503],
  ["legacy confirmation", p => { delete p.data.payment; p.data.requires_verification = false; }, "unresolved", "hold", true, 200],
  ["OTP", p => { delete p.data.payment; p.data.status = "pending_verification"; p.data.requires_verification = true; }, "verification-required", "verify-otp", false, 200],
  ["OTP contradicts false flag", p => { delete p.data.payment; p.data.status = "pending_verification"; p.data.requires_verification = false; }, "unresolved", "hold", false, 503],
  ["Tap pending", p => { Object.assign(p, fixture("pending")); }, "hosted-payment-pending", "hold", false, 503],
  ["Tap without handoff", p => { Object.assign(p, fixture("pending")); p.meta = null; }, "unresolved", "hold", false, 503],
  ["unknown codes", p => { p.data.status = secret; p.data.payment.method = secret; p.data.payment.status = secret; p.data.payment.paid_at = null; }, "unresolved", "hold", false, 503],
];

for (const [label, change, kind, action, legacy, status] of decisionCases) {
  test(`decision diagnostics: ${label}; response and Guest cleanup stay unchanged`, async () => {
    const dev = harness("development", "paid", change);
    const prod = harness("production", "paid", change);
    const result = await dev.run();
    assert.deepEqual(result, await prod.run());
    assert.equal(result.status, status);
    assert.equal(dev.state.calls, 1);
    assert.equal(dev.state.deleted, status === 200 ? 1 : 0);
    assert.deepEqual(dev.state, prod.state);
    assert.equal(prod.logs.length, 0);
    const record = dev.logs.find(([, data]) => data.event === "payment-decision")[1];
    const facts = record.paymentDecision;
    assert.equal(record.stage, "result-mapping");
    assert.equal(facts.outcomeKind, kind);
    assert.equal(facts.decisionAction, action);
    assert.equal(facts.legacyConfirmation, legacy);
    assert.equal(typeof facts.paidAtPresent, "boolean");
    assert.ok([true, false, "missing"].includes(facts.requiresVerification));
    if (label === "valid paid with missing verification") {
      assert.equal(facts.orderStatus, "confirmed");
      assert.equal(facts.paymentMethod, "card");
      assert.equal(facts.paymentStatus, "paid");
      assert.equal(facts.paidAtPresent, true);
      assert.equal(facts.requiresVerification, "missing");
    }
    if (label === "unknown codes") {
      for (const field of ["orderStatus", "paymentMethod", "paymentStatus"]) assert.equal(facts[field], "unrecognized");
    }
    if (status === 503) {
      assert.deepEqual(result.body, { code: "service-unavailable" });
      const failure = dev.logs.find(([, data]) => data.event === "failure")[1];
      assert.deepEqual(failure.paymentDecision, facts);
      assert.equal(failure.contractPath, ["Tap pending", "Tap without handoff", "unknown codes"].includes(label) ? "response.data.payment.method" : "response.data");
    } else assert.equal(result.body.kind, action === "verify-otp" ? "verification-required" : "confirmed");
    const output = JSON.stringify(dev.logs);
    for (const sensitive of [secret, fixture("paid").data.payment.paid_at, "synthetic-test-only", "chg_EXAMPLE", "RF-10373"]) assert.equal(output.includes(sensitive), false);
  });
}

test("all decision fields are runtime-allowlisted, including forged boolean fields and extra keys", () => {
  const h = harness();
  const { createCheckoutPlaceDiagnostics } = h.load("src/features/checkout/server/checkout-place-diagnostics");
  const diagnostics = createCheckoutPlaceDiagnostics();
  diagnostics.paymentDecision(Object.fromEntries([
    "orderStatus", "paymentMethod", "paymentStatus", "paidAtPresent", "requiresVerification",
    "outcomeKind", "decisionAction", "legacyConfirmation", "paymentUrl", "paid_at", "orderNumber",
  ].map(key => [key, secret])));
  const facts = h.logs[0][1].paymentDecision;
  assert.equal(Object.keys(facts).length, 8);
  assert.ok(Object.values(facts).every(value => value === "unrecognized"));
  assert.equal(JSON.stringify(h.logs).includes(secret), false);
  h.logs.push = () => { throw new Error(secret); };
  assert.doesNotThrow(() => diagnostics.paymentDecision({}));
});
