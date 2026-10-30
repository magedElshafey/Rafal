// Local-only backend fixture. This process never contacts Laravel or a provider.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import nextEnv from "@next/env";
import { readFileSync } from "node:fs";
import { pdpFixtureResponse } from "./pdp-fixtures.mjs";

// Explicit opt-in only. Normal CI always uses a synthetic token and mocked provider.
if (process.env.MAP_E2E_LIVE === "1") nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

const city = { id: 1, name: "Riyadh", region_id: 10, is_active: true };
const regions = [{ id: 10, name: "Riyadh Region", cities: [city] }, { id: 20, name: "Other Region", cities: [{ ...city, id: 2, region_id: 20 }] },
  { id: 30, name: "Makkah Region", cities: [{ ...city, id: 3, name: "Jeddah", region_id: 30 }] },
  { id: 40, name: "Eastern Province", cities: [{ ...city, id: 4, name: "Dammam", region_id: 40 }] }];
const address = { id: 1, label: "Home", recipient_name: "Test Buyer", recipient_phone: "+966501234567", city: { id: 1, name: "Riyadh", region: { id: 10, name: "Riyadh Region" } }, district: "Saved District", street_details: "Saved Street", is_default: true, is_serviceable: true, created_at: "2026-01-01T00:00:00Z" };
const lineTotal = { unit_regular_price: "100.00", unit_price: "100.00", discount_per_unit: "0.00", quantity: 1, line_subtotal: "100.00", personalization_fee: "0.00", line_total: "100.00", discount_active: false };
const cart = {
  token: "synthetic-cart", city: { id: 1, name: "Riyadh" }, items_count: 1, lines_count: 1,
  items: [{ id: 1, quantity: 1, personalization: null, stock: { status: "ok", available: 10 }, availability: { city_id: 1, available: 10, in_stock: true },
    product: { id: 1, name: "Test Product", slug: "test", image: null, personalizable: false }, variant: { id: 1, sku: "TEST", attributes: {} }, ...lineTotal }],
  totals: { lines: [lineTotal], items_count: 1, lines_count: 1, subtotal: "100.00", product_discount_total: "0.00", personalization_total: "0.00", coupon_discount: "0.00", gift_wrap_fee: "0.00", shipping_fee: null,
    free_shipping: { enabled: false, threshold: null, qualifies: false, remaining: null }, total: "100.00", vat: { rate: "15", included_amount: "13.04" }, currency: "SAR" },
  coupon: null, gift: { is_gift: false, is_anonymous: false, gift_message: null, gift_wrap: false, recipient: null },
};
const requests = [];
const paymentReads = new Map();
const paymentOrder = JSON.parse(readFileSync(new URL("../fixtures/payment-result-order.json", import.meta.url), "utf8"));
const paymentFlows = process.env.PAYMENT_FLOW_E2E === "1";
const paymentFixture = name => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
const backend = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3100");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Accept-Language,X-Locale");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, "http://127.0.0.1:3101");
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  const send = (data, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(data)); };
  const ok = data => send({ success: true, message: "Test fixture", data });
  if (url.pathname === "/__requests") return send(requests);
  const fields = req.headers["content-type"]?.startsWith("multipart/form-data")
    ? Object.fromEntries(await new Response(raw, { headers: { "Content-Type": req.headers["content-type"] } }).formData())
    : undefined;
  requests.push({ path: url.pathname, method: req.method, body: raw, fields, locale: req.headers["x-locale"], authenticated: Boolean(req.headers.authorization) });
  if (process.env.PDP_PRESENTATION_E2E === "1") {
    const fixture = pdpFixtureResponse(req, url, cart);
    if (fixture) return send(fixture);
  }
  // Explicit local-only opt-in. These responses exercise existing frontend branches;
  // they do not establish any new Laravel method or authenticated Place contract.
  if (paymentFlows && req.method === "POST") {
    if (url.pathname === "/checkout/place" && ["card", "apple_pay", "tap"].includes(fields?.payment_method)) {
      if (req.headers.authorization?.startsWith("Bearer synthetic-auth-hosted")) {
        const data = paymentFixture("checkout-place-hosted");
        data.data.order_number = "RF-E2E-HOSTED";
        data.data.payment.method = fields.payment_method;
        const variant = req.headers.authorization;
        if (variant.endsWith("unsafe")) data.meta.payment.payment_url = "https://unsafe.example.invalid/pay";
        if (variant.endsWith("expired")) data.meta.payment.expires_at = "2000-01-01T00:00:00Z";
        if (variant.endsWith("missing")) delete data.meta.payment.payment_url;
        if (variant.endsWith("mismatch")) data.data.payment.method = "apple_pay";
        return send(data, 201);
      }
      if (["synthetic-payment-unified", "synthetic-payment-cardonly"].includes(req.headers["x-cart-token"])) {
        const data = paymentFixture("checkout-guest-otp");
        data.data.payment.method = fields.payment_method;
        data.data.order_number = `RF-E2E-GUEST-${fields.payment_method.replace("_", "").toUpperCase()}`;
        return send(data, 201);
      }
      if (fields.payment_method !== "card") return send({}, 403);
      const authenticated = req.headers.authorization === "Bearer synthetic-auth";
      if (!authenticated && !/^synthetic-payment-(false|true|missing|empty|failed)$/.test(req.headers["x-cart-token"] ?? "")) return send({}, 403);
      const data = paymentFixture(authenticated ? "checkout-payment-paid" : "checkout-payment-otp-card");
      data.data.order_number = authenticated ? "RF-E2E-CONFIRMED" : `RF-E2E-${req.headers["x-cart-token"].endsWith("true") ? "TRUE" : "FALSE"}`;
      return send(data);
    }
    const verify = url.pathname.match(/^\/checkout\/orders\/(RF-E2E-(?:TRUE|FALSE|UNSAFE|EXPIRED|MISSING|MISMATCH|MALFORMED|GUEST-(?:CARD|APPLEPAY|TAP)(?:-(?:UNSAFE|EXPIRED|MISSING|MISMATCH|MALFORMED))?))\/verify$/);
    if (verify && fields?.phone === "+966501234567" && fields?.otp === "123456") {
      const data = paymentFixture(verify[1].includes("GUEST-") ? "checkout-guest-verify-hosted" : "checkout-verify-hosted");
      data.data.payment.method = verify[1].includes("APPLEPAY") ? "apple_pay" : verify[1].includes("GUEST-TAP") ? "tap" : "card";
      data.data.order_number = verify[1];
      data.data.requires_verification = verify[1].endsWith("TRUE");
      if (verify[1].endsWith("UNSAFE")) data.meta.payment.payment_url = "https://unsafe.example.invalid/pay";
      if (verify[1].endsWith("EXPIRED")) data.meta.payment.expires_at = "2000-01-01T00:00:00Z";
      if (verify[1].endsWith("MISSING")) delete data.meta.payment.payment_url;
      if (verify[1].endsWith("MISMATCH")) data.data.order_number = "RF-OTHER";
      if (verify[1].endsWith("MALFORMED")) return send({ success: true, data: {} });
      return send(data);
    }
    if (url.pathname === "/checkout/quote") return ok({
      totals: { ...cart.totals, shipping_fee: "0.00", vat: { rate: "15", amount: "13.04" } },
      shipping_options: [{ id: 1, code: "standard", name: "Standard", eta_label: "Test delivery", price: "0.00", fee: "0.00", is_free: true, is_pickup: false }],
      fulfillable: true, warehouse: { id: 1, name: "Test warehouse" }, unavailable_lines: [], coupon: null,
      location: { in_coverage: true, city },
    });
  }
  if (/\/checkout\/place|\/verify|\/payment/.test(url.pathname) && req.method !== "GET") return send({}, 403);
  if (url.pathname === "/regions") return ok(regions);
  if (url.pathname === "/auth/me") return ok({ id: 1, first_name: "Test", last_name: "Buyer", email: "test@example.invalid", phone: "966501234567", profile_complete: true, created_at: "2026-01-01T00:00:00Z" });
  if (url.pathname === "/orders/lookup" || /^\/orders\/RF-/.test(url.pathname)) {
    const guest = url.pathname === "/orders/lookup";
    const orderNumber = guest ? fields?.order_number : decodeURIComponent(url.pathname.slice("/orders/".length));
    if (guest ? fields?.phone !== "+966501234567" : req.headers.authorization !== "Bearer synthetic-auth") return send({ success: false }, 403);
    if (orderNumber === "RF-FORBIDDEN") return send({ success: false }, 403);
    if (orderNumber === "RF-ERROR") return send({ success: false, message: "PRIVATE-PROVIDER-ERROR" }, 503);
    if (orderNumber === "RF-MALFORMED") return ok({ payment: { status: "paid" } });
    const count = (paymentReads.get(orderNumber) ?? 0) + 1;
    paymentReads.set(orderNumber, count);
    const data = structuredClone(paymentOrder.data);
    data.order_number = orderNumber === "RF-MISMATCH" ? "RF-OTHER" : orderNumber;
    if (/PENDING|UNKNOWN|STALE|FAILED|CONTRADICTORY/.test(orderNumber)) {
      data.payment.status = orderNumber.includes("UNKNOWN") ? "unrecognized" : orderNumber.includes("FAILED") ? "failed" : "pending";
      data.payment.paid_at = null;
      data.status = orderNumber.includes("FAILED") ? "payment_failed" : "new";
    }
    if (orderNumber === "RF-CONTRADICTORY") { data.payment.status = "paid"; data.status = "payment_failed"; }
    if (orderNumber?.startsWith("RF-STALE") && count > 1) {
      data.status = "confirmed"; data.payment = paymentOrder.data.payment;
    }
    return ok(data);
  }
  if (url.pathname === "/settings/public") return ok({ vat_rate: 15, free_shipping_enabled: false, free_shipping_threshold: null, gift_wrap_enabled: true, gift_wrap_fee: 0, max_addresses_per_user: 10, max_cart_item_quantity: 10, otp_resend_cooldown_seconds: 60, currency: "SAR" });
  if (url.pathname === "/addresses" && req.method === "GET") return send({ success: true, message: "Test", data: [address], meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 } });
  if (url.pathname.startsWith("/addresses") && ["POST", "PUT"].includes(req.method)) return ok({ ...address, ...JSON.parse(raw) });
  if (url.pathname === "/cart") {
    const gift = req.headers["x-cart-token"] === "synthetic-gift";
    return ok({ ...cart, token: req.headers["x-cart-token"] ?? "synthetic-cart", gift: gift ? { ...cart.gift, is_gift: true, recipient: { name: "Recipient", phone: "966501234567", city: { id: 1, name: "Riyadh" }, district: "", street_details: "" } } : cart.gift });
  }
  if (url.pathname === "/checkout/payment-methods") {
    const auth = req.headers.authorization ?? "";
    if (auth.endsWith("hosted-failed")) return send({ success: false }, 503);
    if (auth.endsWith("hosted-cardonly")) return ok({ card: { label: "Card", icon: "card" } });
    const token = req.headers["x-cart-token"];
    if (paymentFlows && token === "synthetic-payment-cardonly") return ok({ card: { label: "Card", icon: "card" } });
    if (paymentFlows && token === "synthetic-payment-failed") return send({ success: false }, 503);
    if (paymentFlows && token === "synthetic-payment-empty") return ok({});
    const methods = { apple_pay: { label: "Apple Pay", icon: "apple" }, bank_transfer: { label: "Bank Transfer", icon: "bank" } };
    if (paymentFlows && token === "synthetic-payment-missing") return ok(methods);
    return ok({ card: { label: "Credit Card / Mada", icon: "card" }, ...methods,
      ...(auth.startsWith("Bearer synthetic-auth-hosted") || token === "synthetic-payment-unified" ? { tap: { label: "Tap", icon: "card" } } : {}) });
  }
  // Outside the explicit payment-flow opt-in, mutations remain disabled.
  if (url.pathname === "/checkout/quote") return send({ success: false, message: "Fixture quote unavailable" }, 422);
  if (url.pathname === "/categories") return send({ success: true, message: "Test", data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } });
  return send({ success: false, message: "Unconfigured fixture" }, 404);
});
backend.listen(3101, "127.0.0.1");
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", process.env.MAP_E2E_PRODUCTION === "1" ? "start" : "dev", "--hostname", "127.0.0.1", "--port", "3100"], {
  stdio: "inherit",
  env: { ...process.env, RAFAL_MAP_E2E: "1", API_BASE_URL: "http://127.0.0.1:3101", NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:3101", SITE_URL: "http://127.0.0.1:3100", NEXT_PUBLIC_LOCATIONIQ_TOKEN: process.env.MAP_E2E_NO_TOKEN ? "" : process.env.MAP_E2E_LIVE === "1" ? process.env.NEXT_PUBLIC_LOCATIONIQ_TOKEN ?? "" : "synthetic-mocked-token", USE_MOCK_AUTH: "false", USE_MOCK_API: "false", NEXT_TELEMETRY_DISABLED: "1" },
});
function close() {
  backend.closeAllConnections();
  backend.close();
  if (process.platform === "win32") {
    spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("exit", () => process.exit(0));
  } else child.kill();
}
process.on("SIGINT", close); process.on("SIGTERM", close);
child.on("exit", code => { backend.close(); process.exitCode = code ?? 0; });
