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
const modules = new Map();
let interceptedFetch = globalThis.fetch;

function loadSource(relativePath) {
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
      AbortSignal,
      Date,
      DOMException,
      FormData,
      Headers,
      Intl,
      module: loaded,
      exports: loaded.exports,
      process,
      Response,
      URL,
      URLSearchParams,
      fetch: (...args) => interceptedFetch(...args),
      require: (specifier) => {
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
}

const { getOrderCustomerStatuses } = loadSource(
  "src/features/orders/utils/order-filters",
);
const { buildOrdersListQuery } = loadSource(
  "src/features/orders/api/orders-query",
);
const { buildOrdersListHref, parseOrderFilter } = loadSource(
  "src/features/orders/utils/orders-search-params",
);
const { parseOrderDetailsResponse, OrdersContractError } = loadSource(
  "src/features/orders/api/parse-orders-dto",
);
const { mapOrderDetails } = loadSource(
  "src/features/orders/api/orders-mapper",
);
const { OrderTimeline } = loadSource(
  "src/features/orders/components/order-timeline",
);
const { createHttpClient } = loadSource("src/lib/api/http-client");

function detailResponse(timeline) {
  return {
    success: true,
    data: {
      id: 1,
      order_number: "ORD-1",
      display_number: "1",
      status: "confirmed",
      customer_status: "confirmed",
      requires_verification: null,
      placed_at: "2026-10-04T09:00:00+03:00",
      items: [],
      gift: null,
      shipping_address: {
        recipient_name: "Customer",
        recipient_phone: "0500000000",
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
        vat: null,
        total: "100",
        currency: "SAR",
      },
      payment: { method: null, status: "pending", paid_at: null },
      verification_expires_at: null,
      timeline,
      can_cancel: false,
      can_reorder: false,
      can_request_return: false,
    },
  };
}

function renderTimeline(events, locale = "en") {
  return renderToStaticMarkup(
    React.createElement(OrderTimeline, {
      events,
      locale,
      pendingLabel: "Pending",
      reachedLabel: "Reached",
      stageLabels: {
        confirmed: "Confirmed",
        processing: "Processing",
        shipped: "Shipped",
        delivered: "Delivered",
      },
      title: "Track order",
    }),
  );
}

test("All filter maps to no backend statuses", () => {
  assert.deepEqual(Array.from(getOrderCustomerStatuses("all")), []);
});

test("In Progress maps to the processing customer-status bucket", () => {
  assert.deepEqual(Array.from(getOrderCustomerStatuses("in-progress")), [
    "processing",
  ]);
});

test("Completed maps to the completed customer-status bucket", () => {
  assert.deepEqual(Array.from(getOrderCustomerStatuses("completed")), [
    "completed",
  ]);
});

test("Cancelled maps to the cancelled customer-status bucket", () => {
  assert.deepEqual(Array.from(getOrderCustomerStatuses("cancelled")), [
    "cancelled",
  ]);
});

test("Backend owns internal-state grouping for customer-status filters", () => {
  const liveContractExample = {
    customer_status: "processing",
    status_label: "Confirmed",
  };

  assert.equal(liveContractExample.customer_status, "processing");
  assert.equal(liveContractExample.status_label, "Confirmed");
  assert.deepEqual(Array.from(getOrderCustomerStatuses("in-progress")), [
    "processing",
  ]);
});

test("Real HTTP serialization emits repeated bracketed status keys", async () => {
  const client = createHttpClient({
    baseUrl: new URL("https://api.example.test/api"),
    maxRetries: 0,
  });

  async function requestUrl(filter, page) {
    let outgoingUrl;
    interceptedFetch = async (input) => {
      outgoingUrl = new URL(String(input));
      return new Response(null, { status: 204 });
    };
    await client.request({
      path: "/orders",
      query: buildOrdersListQuery(page, getOrderCustomerStatuses(filter)),
    });
    assert.ok(outgoingUrl);
    return outgoingUrl;
  }

  const inProgress = await requestUrl("in-progress", 1);
  assert.equal(
    inProgress.search,
    "?page=1&status%5B%5D=processing",
  );
  assert.deepEqual(inProgress.searchParams.getAll("status[]"), ["processing"]);
  assert.deepEqual(inProgress.searchParams.getAll("status"), []);

  const completed = await requestUrl("completed", 1);
  assert.equal(completed.search, "?page=1&status%5B%5D=completed");
  assert.deepEqual(completed.searchParams.getAll("status[]"), ["completed"]);
  assert.deepEqual(completed.searchParams.getAll("status"), []);

  const cancelled = await requestUrl("cancelled", 1);
  assert.equal(cancelled.search, "?page=1&status%5B%5D=cancelled");
  assert.deepEqual(cancelled.searchParams.getAll("status[]"), ["cancelled"]);
  assert.deepEqual(cancelled.searchParams.getAll("status"), []);

  const all = await requestUrl("all", 1);
  assert.equal(all.search, "?page=1");
  assert.deepEqual(all.searchParams.getAll("status[]"), []);
  assert.deepEqual(all.searchParams.getAll("status"), []);

  for (const url of [inProgress, completed, cancelled, all]) {
    for (const internalStatus of [
      "new",
      "confirmed",
      "shipped",
      "delivered",
      "returned",
      "payment_failed",
      "pending_verification",
    ]) {
      assert.ok(!url.searchParams.getAll("status[]").includes(internalStatus));
    }
    assert.ok(!url.searchParams.get("status[]")?.includes(","));
  }
});

test("Pagination URL preserves active filter", () => {
  assert.equal(
    buildOrdersListHref({ filter: "in-progress", page: 3 }),
    "/account/orders?filter=in-progress&page=3",
  );
});

test("Changing filter starts on page one", () => {
  assert.equal(
    buildOrdersListHref({ filter: "completed" }),
    "/account/orders?filter=completed",
  );
});

test("Page one remains omitted from customer URLs", () => {
  assert.equal(
    buildOrdersListHref({ filter: "cancelled", page: 1 }),
    "/account/orders?filter=cancelled",
  );
  assert.equal(
    buildOrdersListHref({ filter: "all", page: 1 }),
    "/account/orders",
  );
});

test("Invalid customer filters cannot select or expose backend statuses", () => {
  for (const candidate of ["unexpected", "processing", "payment_failed"]) {
    const filter = parseOrderFilter(candidate);
    assert.equal(filter, "all");
    assert.deepEqual(Array.from(getOrderCustomerStatuses(filter)), []);
    const href = buildOrdersListHref({ filter, page: 2 });
    assert.equal(href, "/account/orders?page=2");
    assert.ok(!href.includes("status"));
  }
});

test("Customer filter URLs never expose backend status parameters", () => {
  for (const filter of ["all", "in-progress", "completed", "cancelled"]) {
    const href = buildOrdersListHref({ filter, page: 2 });
    assert.ok(!href.includes("status"));
  }
});

test("Orders list stays server-authenticated without a Dashboard statuses request", () => {
  const apiSource = readFileSync(
    path.join(root, "src/features/orders/api/orders-api.server.ts"),
    "utf8",
  );
  const boundarySource = readFileSync(
    path.join(root, "src/features/orders/server/orders-boundary.ts"),
    "utf8",
  );

  assert.match(apiSource, /^import "server-only";/);
  assert.match(boundarySource, /^import "server-only";/);
  assert.match(boundarySource, /getAccessToken\(\)/);
  assert.doesNotMatch(
    apiSource,
    /path:\s*["`][^"`]*(?:dashboard|statuses)/i,
  );
});

test("Incoming historical display aliases remain tolerated", () => {
  const detailsSource = readFileSync(
    path.join(root, "src/features/orders/components/order-details-content.tsx"),
    "utf8",
  );
  const badgeSource = readFileSync(
    path.join(root, "src/features/orders/components/order-status-badge.tsx"),
    "utf8",
  );

  for (const alias of ["proccessing", "reterned", "canceled"]) {
    assert.ok(detailsSource.includes(alias));
    assert.ok(badgeSource.includes(alias));
  }
});

test("Valid reached_at maps to reachedAt", () => {
  const parsed = parseOrderDetailsResponse(
    detailResponse([
      { step: "Confirmed", reached: true, reached_at: "2026-10-04T09:00:00+03:00" },
    ]),
  );
  assert.equal(
    mapOrderDetails(parsed).timeline[0].reachedAt,
    "2026-10-04T09:00:00+03:00",
  );
});

test("Null reached_at maps to null", () => {
  const parsed = parseOrderDetailsResponse(
    detailResponse([{ step: "Confirmed", reached: false, reached_at: null }]),
  );
  assert.equal(mapOrderDetails(parsed).timeline[0].reachedAt, null);
});

test("Malformed reached_at is rejected by runtime parsing", () => {
  assert.throws(
    () =>
      parseOrderDetailsResponse(
        detailResponse([{ step: "Confirmed", reached: true, reached_at: "not-a-date" }]),
      ),
    OrdersContractError,
  );
});

test("Reached timeline step renders a localized semantic date", () => {
  const html = renderTimeline([
    { step: "Confirmed", reached: true, reachedAt: "2026-10-04T09:00:00+03:00" },
  ]);
  assert.match(html, /<time dateTime="2026-10-04T09:00:00\+03:00"/);
  assert.ok(!html.includes("2026-10-04T09:00:00+03:00</time>"));
});

test("Pending timeline step with null timestamp renders no date", () => {
  const html = renderTimeline([
    { step: "Processing", reached: false, reachedAt: null },
  ]);
  assert.ok(!html.includes("<time"));
  assert.ok(html.includes("Pending"));
});

test("False reached state suppresses a structurally valid timestamp", () => {
  const html = renderTimeline([
    { step: "Shipped", reached: false, reachedAt: "2026-10-04T09:00:00+03:00" },
  ]);
  assert.ok(!html.includes("<time"));
  assert.ok(html.includes("Pending"));
  assert.ok(!html.includes(">Reached<"));
});

test("Cancelled all-false/null timeline renders only backend stages safely", () => {
  const html = renderTimeline(
    ["Confirmed", "Processing", "Shipped", "Delivered"].map((step) => ({
      step,
      reached: false,
      reachedAt: null,
    })),
  );
  assert.equal((html.match(/Pending/g) ?? []).length, 4);
  assert.ok(!html.includes("Cancelled"));
  assert.ok(!html.includes("<time"));
});
