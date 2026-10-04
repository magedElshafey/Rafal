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
        console,
        module: loaded,
        exports: loaded.exports,
        process,
        URLSearchParams,
        fetch: (...args) => globalThis.fetch(...args),
        require: (specifier) => {
          if (specifier in overrides) return overrides[specifier];
          return specifier.startsWith("@/")
            ? loadSource(`src/${specifier.slice(2)}`)
            : require(specifier);
        },
      },
      { filename },
    );
    return loaded.exports;
  };
}

const copy = {
  backToOrders: "Back",
  cancel: {
    action: "Cancel order",
    cancel: "Keep order",
    confirm: "Cancel order",
    description: "Confirm cancellation",
    error: "Error",
    loading: "Cancelling",
    success: "Cancelled",
    title: "Cancel order?",
  },
  payment: {
    method: "Method",
    methodLabels: {},
    paidAt: "Paid at",
    status: "Status",
    statusLabels: {},
    title: "Payment",
    total: "Total",
  },
  placedAt: (date) => date,
  products: {
    attributeLabels: {},
    quantity: (count) => String(count),
    title: "Products",
    unitPrice: "Unit price",
  },
  shipping: {
    address: "Address",
    method: "Method",
    phone: "Phone",
    recipient: "Recipient",
    title: "Shipping",
  },
  statusLabels: {},
  timeline: { pending: "Pending", reached: "Reached", stageLabels: {}, title: "Timeline" },
};

function order(canCancel) {
  return {
    orderNumber: "ORD/100",
    displayNumber: "100",
    status: "confirmed",
    placedAt: "2026-10-04T00:00:00Z",
    customerStatus: "confirmed",
    items: [],
    timeline: [],
    shippingAddress: {},
    shippingMethod: null,
    money: { currency: "SAR" },
    payment: {},
    capabilities: { canCancel, canReorder: false, canRequestReturn: false },
  };
}

test("Order details renders cancellation only when can_cancel maps to true", () => {
  const element = (name) => {
    function StubComponent() {
      return React.createElement("div", null, name);
    }
    return StubComponent;
  };
  function StubLink({ children, ...props }) {
    return React.createElement("a", props, children);
  }
  const loadSource = createLoader({
    "@/components/ui/icons": { ChevronLeftIcon: element("back") },
    "@/features/orders/components/cancel-order-action": {
      CancelOrderAction: element("cancel-action"),
    },
    "@/features/order-returns/components/order-return-action": {
      OrderReturnAction: element("return-action"),
    },
    "@/features/orders/components/order-address": { OrderAddress: element("address") },
    "@/features/orders/components/order-items": { OrderItems: element("items") },
    "@/features/orders/components/order-payment-summary": { OrderPaymentSummary: element("payment") },
    "@/features/orders/components/order-status-badge": { OrderStatusBadge: element("status") },
    "@/features/orders/components/order-timeline": { OrderTimeline: element("timeline") },
    "@/features/orders/utils/order-formatters": { formatOrderDate: () => "date" },
    "@/i18n/navigation": { Link: StubLink },
  });
  const { OrderDetailsView } = loadSource("src/features/orders/components/order-details-view");

  const hidden = renderToStaticMarkup(
    React.createElement(OrderDetailsView, { copy, locale: "en", order: order(false) }),
  );
  const available = renderToStaticMarkup(
    React.createElement(OrderDetailsView, { copy, locale: "en", order: order(true) }),
  );

  assert.ok(!hidden.includes("cancel-action"));
  assert.ok(available.includes("cancel-action"));
});

test("Cancellation client uses one empty-body POST and does not retry a failure", async () => {
  const loadSource = createLoader();
  const { cancelOrderFromBrowser } = loadSource("src/features/orders/api/cancel-order");
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (...args) => {
    calls.push(args);
    return new Response(JSON.stringify({ code: "cancellation-rejected" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await assert.rejects(() => cancelOrderFromBrowser("en", "ORD/100"));
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/api/orders/ORD%2F100/cancel?locale=en");
  assert.equal(calls[0][1].method, "POST");
  assert.ok(!("body" in calls[0][1]));
});

test("Cancellation rejects a response belonging to another order", () => {
  const loadSource = createLoader();
  const { assertCancelledOrderIdentity, OrderIdentityMismatchError } = loadSource(
    "src/features/orders/utils/order-cancellation",
  );

  assert.doesNotThrow(() => assertCancelledOrderIdentity("ORD-100", "ORD-100"));
  assert.throws(
    () => assertCancelledOrderIdentity("ORD-100", "ORD-101"),
    OrderIdentityMismatchError,
  );
});

test("Cancellation UI keeps a synchronous in-flight guard before its request", () => {
  const source = readFileSync(
    path.join(root, "src/features/orders/components/cancel-order-action.tsx"),
    "utf8",
  );
  const guard = source.indexOf("if (submissionPendingRef.current) return;");
  const lock = source.indexOf("submissionPendingRef.current = true;", guard);
  const request = source.indexOf("await cancelOrderFromBrowser", lock);
  assert.ok(guard >= 0 && lock > guard && request > lock);
});
