import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
let interceptedFetch = globalThis.fetch;

function createLoader(overrides = {}) {
  const modules = new Map();
  return function loadSource(relativePath) {
    const base = path.join(root, relativePath);
    const filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    assert.ok(filename, `Resolve ${relativePath}`);
    if (modules.has(filename)) return modules.get(filename).exports;

    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    const loaded = { exports: {} };
    modules.set(filename, loaded);
    vm.runInNewContext(
      outputText,
      {
        AbortSignal,
        console,
        Date,
        DOMException,
        FormData,
        Headers,
        Intl,
        module: loaded,
        exports: loaded.exports,
        process,
        Request,
        Response,
        URL,
        URLSearchParams,
        fetch: (...args) => interceptedFetch(...args),
        requestAnimationFrame: (callback) => callback(),
        require: (specifier) => {
          if (specifier in overrides) return overrides[specifier];
          if (specifier.startsWith("@/")) {
            return loadSource(`src/${specifier.slice(2)}`);
          }
          if (specifier.startsWith(".")) {
            const resolved = path
              .relative(root, path.resolve(path.dirname(filename), specifier))
              .replaceAll("\\", "/");
            return loadSource(resolved);
          }
          return require(specifier);
        },
      },
      { filename },
    );
    return loaded.exports;
  };
}

const loadSource = createLoader({
  "server-only": {},
  "@/features/orders/api/guest-orders-api.server": {
    lookupGuestOrderDto: async () => {
      throw new Error("Not used in these unit tests.");
    },
  },
});
const { parseGuestOrderLookupInput, buildGuestOrderLookupFormData } = loadSource(
  "src/features/orders/utils/guest-order-lookup-contract",
);
const { parseGuestOrderLookupResponse } = loadSource(
  "src/features/orders/api/parse-guest-order-dto",
);
const { mapOrderDetails } = loadSource("src/features/orders/api/orders-mapper");
const { lookupGuestOrderFromBrowser } = loadSource(
  "src/features/orders/api/guest-order-lookup",
);
const { classifyGuestOrderLookupError } = loadSource(
  "src/features/orders/server/guest-order-boundary",
);
const { ApiError } = loadSource("src/lib/api/api-error");

function guestResponse(overrides = {}) {
  return {
    success: true,
    data: {
      id: 1,
      order_number: "RF-10208",
      display_number: "10208",
      status: "confirmed",
      customer_status: "confirmed",
      placed_at: "2026-10-04T09:00:00+03:00",
      items: [],
      gift: null,
      shipping_address: {
        recipient_name: "Guest",
        recipient_phone: "+966500000000",
        city: null,
        district: "District",
        street_details: "Street",
      },
      shipping_method: null,
      money: {
        subtotal: null,
        discount_total: null,
        shipping_fee: null,
        personalization_total: null,
        gift_wrap_fee: null,
        taxable_amount: null,
        vat_amount: "18.26",
        total: "140",
        currency: "SAR",
      },
      payment: { method: null, status: "pending", paid_at: null },
      verification_expires_at: null,
      timeline: [{ step: "Confirmed", reached: false }],
      can_cancel: true,
      can_reorder: true,
      ...overrides,
    },
  };
}

test("BFF input contract rejects order-number-only lookup", () => {
  assert.equal(
    parseGuestOrderLookupInput({ orderNumber: "RF-10208", method: "email" }),
    null,
  );
});

test("Email mode creates order_number and email only", () => {
  const input = parseGuestOrderLookupInput({
    orderNumber: " RF-10208 ",
    method: "email",
    identity: " Guest@Example.com ",
  });
  assert.ok(input);
  const formData = buildGuestOrderLookupFormData(input);
  assert.deepEqual(Array.from(formData.entries()), [
    ["order_number", "RF-10208"],
    ["email", "guest@example.com"],
  ]);
  assert.equal(formData.has("phone"), false);
});

test("Phone mode creates order_number and normalized phone only", () => {
  const input = parseGuestOrderLookupInput({
    orderNumber: "RF-10208",
    method: "phone",
    identity: "050 123 4567",
  });
  assert.ok(input);
  const formData = buildGuestOrderLookupFormData(input);
  assert.deepEqual(Array.from(formData.entries()), [
    ["order_number", "RF-10208"],
    ["phone", "+966501234567"],
  ]);
  assert.equal(formData.has("email"), false);
});

test("Unsupported or ambiguous lookup methods are rejected", () => {
  assert.equal(
    parseGuestOrderLookupInput({
      orderNumber: "RF-10208",
      method: "username",
      identity: "guest",
    }),
    null,
  );
  assert.equal(
    parseGuestOrderLookupInput({
      orderNumber: "RF-10208",
      method: "email",
      identity: "guest@example.com",
      phone: "0501234567",
    }),
    null,
  );
});

test("Browser lookup keeps email and phone out of the URL", async () => {
  let request;
  interceptedFetch = async (...args) => {
    request = args;
    return Response.json({ ok: false, code: "lookup-mismatch" }, { status: 404 });
  };
  await lookupGuestOrderFromBrowser("en", {
    orderNumber: "RF-10208",
    method: "email",
    identity: "guest@example.com",
  });
  assert.equal(request[0], "/api/orders/lookup");
  assert.ok(!request[0].includes("guest@example.com"));
  assert.ok(request[1].body.includes("guest@example.com"));
});

test("Guest backend request has no Cart-token dependency", async () => {
  let config;
  const loader = createLoader({
    "server-only": {},
    "@/features/orders/api/parse-guest-order-dto": {
      parseGuestOrderLookupResponse: (value) => value,
    },
    "@/lib/api/server-api": {
      serverApi: {
        request: async (value) => {
          config = value;
          return { success: true };
        },
      },
    },
  });
  const { lookupGuestOrderDto } = loader(
    "src/features/orders/api/guest-orders-api.server",
  );
  await lookupGuestOrderDto("en", {
    orderNumber: "RF-10208",
    method: "email",
    identity: "guest@example.com",
  });
  assert.equal(config.headers["X-Cart-Token"], undefined);
  assert.equal(config.headers["x-cart-token"], undefined);
});

test("Guest backend request has no Authorization dependency", async () => {
  let config;
  const loader = createLoader({
    "server-only": {},
    "@/features/orders/api/parse-guest-order-dto": {
      parseGuestOrderLookupResponse: (value) => value,
    },
    "@/lib/api/server-api": {
      serverApi: {
        request: async (value) => {
          config = value;
          return { success: true };
        },
      },
    },
  });
  const { lookupGuestOrderDto } = loader(
    "src/features/orders/api/guest-orders-api.server",
  );
  await lookupGuestOrderDto("ar", {
    orderNumber: "RF-10208",
    method: "phone",
    identity: "+966501234567",
  });
  assert.equal(config.headers.Authorization, undefined);
  assert.equal(config.method, "POST");
  assert.equal(config.path, "/orders/lookup");
});

test("One browser submission makes one request with no automatic retry", async () => {
  let calls = 0;
  interceptedFetch = async () => {
    calls += 1;
    throw new TypeError("network failure");
  };
  const result = await lookupGuestOrderFromBrowser("en", {
    orderNumber: "RF-10208",
    method: "email",
    identity: "guest@example.com",
  });
  assert.equal(calls, 1);
  assert.deepEqual({ ...result }, { ok: false, code: "service-unavailable" });
});

test("Wrong-order and wrong-identity backend outcomes share one mismatch category", () => {
  const notFound = classifyGuestOrderLookupError(
    new ApiError({ status: 404, message: "not found" }),
  );
  const rejected = classifyGuestOrderLookupError(
    new ApiError({ status: 422, message: "wrong identity" }),
  );
  assert.equal(notFound, "lookup-mismatch");
  assert.equal(rejected, notFound);
});

test("HTTP 429 maps to rate-limited", () => {
  assert.equal(
    classifyGuestOrderLookupError(
      new ApiError({ status: 429, message: "limited" }),
    ),
    "rate-limited",
  );
});

test("HTTP 5xx maps to generic service failure", () => {
  assert.equal(
    classifyGuestOrderLookupError(
      new ApiError({ status: 503, message: "unavailable" }),
    ),
    "service-unavailable",
  );
});

test("Historical vat_amount maps without inventing a VAT rate", () => {
  const order = mapOrderDetails(parseGuestOrderLookupResponse(guestResponse()));
  assert.deepEqual({ ...order.money.vat }, { rate: null, amount: "18.26" });
});

test("Modern nested VAT shape remains supported", () => {
  const response = guestResponse();
  response.data.money = {
    ...response.data.money,
    vat: { rate: "15", amount: "18.26" },
  };
  delete response.data.money.vat_amount;
  const order = mapOrderDetails(parseGuestOrderLookupResponse(response));
  assert.deepEqual({ ...order.money.vat }, { rate: "15", amount: "18.26" });
});

test("Historical timeline without reached_at maps reachedAt to null", () => {
  const order = mapOrderDetails(parseGuestOrderLookupResponse(guestResponse()));
  assert.equal(order.timeline[0].reachedAt, null);
});

test("Modern Guest timeline validates and maps reached_at", () => {
  const order = mapOrderDetails(
    parseGuestOrderLookupResponse(
      guestResponse({
        timeline: [
          {
            step: "Confirmed",
            reached: true,
            reached_at: "2026-10-04T09:00:00+03:00",
          },
        ],
      }),
    ),
  );
  assert.equal(order.timeline[0].reachedAt, "2026-10-04T09:00:00+03:00");
});

test("Absent can_request_return fails closed", () => {
  const order = mapOrderDetails(parseGuestOrderLookupResponse(guestResponse()));
  assert.equal(order.capabilities.canRequestReturn, false);
});

test("Malformed secondary variant metadata does not crash Guest details", () => {
  const response = guestResponse({
    items: [
      {
        id: 2,
        product_name: "Historical product",
        variant_sku: "SKU-1",
        variant_attributes: { color: { invalid: true } },
        quantity: 1,
        unit_price: "100",
        discount_amount: null,
        line_total: "100",
      },
    ],
  });
  const order = mapOrderDetails(parseGuestOrderLookupResponse(response));
  assert.equal(order.items[0].orderItemId, "2");
  assert.equal(order.items[0].productId, null);
  assert.deepEqual(Object.entries(order.items[0].variantAttributes), []);
});

test("Invalid core Order identity still fails contract parsing", () => {
  assert.throws(() =>
    parseGuestOrderLookupResponse(guestResponse({ order_number: "" })),
  );
});

test("Guest result composes the shared Order Details presentation", () => {
  const source = readFileSync(
    path.join(root, "src/features/orders/components/guest-order-result.tsx"),
    "utf8",
  );
  assert.match(source, /<OrderDetailsHeader/);
  assert.match(source, /<OrderDetailsContent/);
});

test("Guest result never renders Cancel even when capability is true", () => {
  const loader = createLoader({
    "@/components/ui/button": {
      Button: ({ children, ...props }) => React.createElement("button", props, children),
    },
    "@/features/orders/components/order-details-content": {
      OrderDetailsHeader: ({ actions }) =>
        React.createElement("header", null, "shared-header", actions),
      OrderDetailsContent: () => React.createElement("div", null, "shared-content"),
    },
  });
  const { GuestOrderResult } = loader(
    "src/features/orders/components/guest-order-result",
  );
  const html = renderToStaticMarkup(
    React.createElement(GuestOrderResult, {
      changeDetailsLabel: "Track another order",
      copy: {},
      headingRef: { current: null },
      locale: "en",
      onChangeDetails: () => {},
      order: { capabilities: { canCancel: true, canReorder: true, canRequestReturn: true } },
    }),
  );
  assert.ok(html.includes("shared-content"));
  assert.ok(!html.includes("Cancel"));
});

test("Guest presentation contains no Reorder or Return action", () => {
  const source = readFileSync(
    path.join(root, "src/features/orders/components/guest-order-result.tsx"),
    "utf8",
  );
  assert.ok(!/reorder|requestReturn|canRequestReturn/i.test(source));
});

test("Guest historical attributes retain the shared swatch presentation path", () => {
  const content = readFileSync(
    path.join(root, "src/features/orders/components/order-details-content.tsx"),
    "utf8",
  );
  const items = readFileSync(
    path.join(root, "src/features/orders/components/order-items.tsx"),
    "utf8",
  );
  assert.match(content, /<OrderItems/);
  assert.match(items, /<VariantAttributeValue/);
});

test("Guest tracking requires no Product API enrichment", () => {
  for (const file of [
    "src/features/orders/components/guest-order-lookup.tsx",
    "src/features/orders/components/guest-order-result.tsx",
    "src/features/orders/server/guest-order-boundary.ts",
  ]) {
    assert.ok(!readFileSync(path.join(root, file), "utf8").includes("features/products"));
  }
});
