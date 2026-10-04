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

function sourceLoader(overrides = {}, globals = {}) {
  const modules = new Map();
  function load(relativePath) {
    const base = path.join(root, relativePath);
    const filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    assert.ok(filename, `Resolve ${relativePath}`);
    if (modules.has(filename)) return modules.get(filename).exports;
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    const loaded = { exports: {} };
    modules.set(filename, loaded);
    vm.runInNewContext(
      outputText,
      {
        AbortController,
        AbortSignal,
        DOMException,
        FormData,
        Headers,
        Request,
        Response,
        URL,
        URLSearchParams,
        console: overrides.console ?? console,
        exports: loaded.exports,
        fetch: (...args) => interceptedFetch(...args),
        module: loaded,
        process,
        setTimeout,
        ...globals,
        require: (specifier) => {
          if (specifier in overrides) return overrides[specifier];
          if (specifier === "server-only") return {};
          if (specifier.startsWith("@phosphor-icons/react")) {
            return new Proxy(
              {},
              { get: () => (props) => React.createElement("svg", props) },
            );
          }
          if (specifier.startsWith("@/")) {
            return load(`src/${specifier.slice(2)}`);
          }
          if (specifier.startsWith(".")) {
            const resolved = path
              .relative(root, path.resolve(path.dirname(filename), specifier))
              .replaceAll("\\", "/");
            return load(resolved);
          }
          return require(specifier);
        },
      },
      { filename },
    );
    return loaded.exports;
  }
  return load;
}

function submissionResponse(overrides = {}) {
  return {
    success: true,
    message: "Review submitted successfully and is pending moderation",
    data: {
      id: 4,
      rating: 5,
      comment: "good product",
      status: "pending",
      created_at: "2026-10-04T10:00:00+03:00",
      ...overrides,
    },
  };
}

function orderResponse() {
  return {
    success: true,
    data: {
      id: 1,
      order_number: "ORD-1",
      display_number: "1",
      status: "delivered",
      customer_status: "completed",
      requires_verification: null,
      placed_at: "2026-10-04T09:00:00+03:00",
      items: [
        {
          id: 21,
          product_id: 17,
          product_name: "Gift box",
          variant_sku: "RAF-VAR-21",
          variant_attributes: { color: "Gold" },
          quantity: 1,
          unit_price: "100.00",
          discount_amount: null,
          line_total: "100.00",
        },
      ],
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
        total: "100.00",
        currency: "SAR",
      },
      payment: { method: null, status: "paid", paid_at: null },
      verification_expires_at: null,
      timeline: [],
      can_cancel: false,
      can_reorder: false,
      can_request_return: false,
    },
  };
}

const reviewCopy = {
  action: "Rate product",
  pendingReview: "Pending review",
  title: "Rate product",
  question: "How would you rate this product?",
  ratingLabel: "{rating} out of 5",
  ratingRequired: "Select a rating.",
  commentLabel: "Share your experience",
  commentPlaceholder: "Tell us what you thought",
  cancel: "Cancel",
  submit: "Submit review",
  submitting: "Submitting review",
  close: "Close",
  successTitle: "Review submitted",
  successBody: "Thanks. Your review will appear after moderation.",
  developmentDiagnostic: "Development diagnostic",
  errors: {
    auth: "Session expired",
    validation: "Review fields",
    notAllowed: "Not allowed",
    rateLimited: "Try later",
    service: "Unavailable",
  },
};

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("authenticated Order item and Product identities normalize separately", () => {
  const load = sourceLoader();
  const { parseOrderDetailsResponse } = load(
    "src/features/orders/api/parse-orders-dto",
  );
  const { mapOrderDetails } = load("src/features/orders/api/orders-mapper");
  const raw = orderResponse();
  const parsed = parseOrderDetailsResponse(raw);
  const mapped = mapOrderDetails(parsed);

  assert.equal(parsed.data.items[0].id, 21);
  assert.equal(parsed.data.items[0].product_id, 17);
  assert.equal(mapped.items[0].orderItemId, "21");
  assert.equal(mapped.items[0].productId, "17");
  assert.notEqual(mapped.items[0].orderItemId, mapped.items[0].productId);
  assert.equal("id" in mapped.items[0], false);

  raw.data.items[0].id = 0;
  assert.throws(() => parseOrderDetailsResponse(raw));

  for (const productId of [undefined, 0, -1, 1.5, "17", Number.MAX_SAFE_INTEGER + 1]) {
    const invalid = orderResponse();
    if (productId === undefined) delete invalid.data.items[0].product_id;
    else invalid.data.items[0].product_id = productId;
    assert.throws(() => parseOrderDetailsResponse(invalid));
  }
});

test("Order Product rendering submits Product ID and keys by Order Item ID", () => {
  const calls = [];
  const load = sourceLoader({
    "@/features/reviews/components/order-product-review-action": {
      OrderProductReviewAction: (props) => {
        calls.push(props);
        return React.createElement("button", null, props.copy.action);
      },
    },
  });
  const { OrderItems } = load("src/features/orders/components/order-items");
  const items = [
    {
      orderItemId: "21",
      productId: "17",
      productName: "Gift box",
      variantSku: "RAF-VAR-21",
      variantAttributes: {},
      quantity: 1,
      unitPrice: "100",
      discountAmount: null,
      lineTotal: "100",
    },
    {
      orderItemId: "22",
      productId: "17",
      productName: "Gift box",
      variantSku: "RAF-VAR-22",
      variantAttributes: {},
      quantity: 1,
      unitPrice: "100",
      discountAmount: null,
      lineTotal: "100",
    },
  ];
  const html = renderToStaticMarkup(
    React.createElement(OrderItems, {
      attributeLabels: {},
      currency: "SAR",
      items,
      locale: "en",
      quantityLabel: (count) => `Quantity ${count}`,
      reviewCopy,
      title: "Products",
      unitPriceLabel: "Unit price",
    }),
  );

  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((call) => call.productId), ["17", "17"]);
  assert.ok(calls.every((call) => !("orderItemId" in call)));
  assert.ok(calls.every((call) => !("variantSku" in call)));
  assert.match(html, /Rate product/);
  const source = readFileSync(
    path.join(root, "src/features/orders/components/order-items.tsx"),
    "utf8",
  );
  assert.match(source, /key=\{item\.orderItemId\}/);
  assert.doesNotMatch(source, /key=\{item\.productId\}/);
  assert.doesNotMatch(source, /key=\{index\}/);
});

test("delivered authenticated Order enables review copy while other states and Guest do not", () => {
  const contentCalls = [];
  const load = sourceLoader({
    "@/features/orders/components/order-details-content": {
      OrderDetailsHeader: () => React.createElement("header"),
      OrderDetailsContent: (props) => {
        contentCalls.push(props);
        return React.createElement(
          "div",
          null,
          props.productReviewCopy?.action ?? "read-only",
        );
      },
    },
    "@/features/orders/components/cancel-order-action": {
      CancelOrderAction: () => null,
    },
    "@/components/ui/icons": {
      ChevronLeftIcon: () => React.createElement("svg"),
    },
    "@/i18n/navigation": {
      Link: ({ children, ...props }) => React.createElement("a", props, children),
    },
  });
  const { OrderDetailsView } = load(
    "src/features/orders/components/order-details-view",
  );
  const order = {
    status: "delivered",
    capabilities: { canCancel: false },
  };
  const copy = { backToOrders: "Back", cancel: {}, productReview: reviewCopy };
  const delivered = renderToStaticMarkup(
    React.createElement(OrderDetailsView, { copy, locale: "en", order }),
  );
  const processing = renderToStaticMarkup(
    React.createElement(OrderDetailsView, {
      copy,
      locale: "en",
      order: { ...order, status: "processing" },
    }),
  );
  assert.match(delivered, /Rate product/);
  assert.match(processing, /read-only/);

  const guestSource = readFileSync(
    path.join(root, "src/features/orders/components/guest-order-result.tsx"),
    "utf8",
  );
  assert.doesNotMatch(
    guestSource,
    /OrderProductReviewAction|productReviewCopy|reviewCopy/,
  );
  assert.equal(contentCalls.length, 2);
});

test("rating input keeps five native whole-star radios without boxed controls", () => {
  const load = sourceLoader();
  const { ProductReviewRatingInput } = load(
    "src/features/reviews/components/product-review-rating-input",
  );
  const html = renderToStaticMarkup(
    React.createElement(ProductReviewRatingInput, {
      legend: "How would you rate this product?",
      name: "rating",
      onChange() {},
      ratingLabelTemplate: "{rating} out of 5",
      value: null,
      error: "Select a rating",
    }),
  );
  const values = Array.from(html.matchAll(/type="radio"[^>]*value="([^"]+)"/g),
    (match) => match[1]);
  assert.deepEqual(values, ["1", "2", "3", "4", "5"]);
  assert.equal((html.match(/required=""/g) ?? []).length, 5);
  assert.equal((html.match(/aria-label="[1-5] out of 5"/g) ?? []).length, 5);
  assert.ok(values.every((value) => !value.includes(".")));
  assert.match(html, /<fieldset[^>]*aria-describedby="rating-error"/);
  assert.equal((html.match(/aria-hidden="true"/g) ?? []).length, 5);
  assert.doesNotMatch(html, /border-gray-200|bg-gray-0/);
});

test("selected rating fills cumulatively while preserving LTR numeric semantics", () => {
  const load = sourceLoader();
  const { ProductReviewRatingInput } = load(
    "src/features/reviews/components/product-review-rating-input",
  );
  for (const [value, activeCount] of [[1, 1], [4, 4], [5, 5]]) {
    const html = renderToStaticMarkup(
      React.createElement(ProductReviewRatingInput, {
        legend: "Rating",
        name: `rating-${value}`,
        onChange() {},
        ratingLabelTemplate: "{rating} out of 5",
        value,
      }),
    );
    assert.equal((html.match(/data-active="true"/g) ?? []).length, activeCount);
    assert.equal((html.match(/data-selected="true"/g) ?? []).length, 1);
    assert.match(html, /dir="ltr"/);
  }
  const source = readFileSync(
    path.join(root, "src/features/reviews/components/product-review-rating-input.tsx"),
    "utf8",
  );
  assert.match(source, /onPointerEnter/);
  assert.match(source, /setPreview\(rating\)/);
  assert.doesNotMatch(source, /onPointerEnter[\s\S]{0,160}onChange\(rating\)/);
});

test("submission parser accepts only confirmed pending whole-star responses", () => {
  const load = sourceLoader();
  const {
    parseProductReviewSubmissionResponse,
    ProductReviewsContractError,
  } = load("src/features/reviews/api/parse-product-reviews-dto");
  const parsed = parseProductReviewSubmissionResponse(submissionResponse());
  assert.equal(parsed.data.id, 4);
  assert.equal(parsed.data.rating, 5);
  assert.equal(parsed.data.status, "pending");

  for (const mutate of [
    (value) => { value.success = false; },
    (value) => { value.data.id = 0; },
    (value) => { value.data.rating = 2.5; },
    (value) => { value.data.comment = {}; },
    (value) => { value.data.status = "approved"; },
    (value) => { value.data.created_at = "invalid"; },
  ]) {
    const value = submissionResponse();
    mutate(value);
    assert.throws(
      () => parseProductReviewSubmissionResponse(value),
      ProductReviewsContractError,
    );
  }
});

test("Laravel submission uses one authenticated multipart POST with no Cart identity", async () => {
  const requests = [];
  const load = sourceLoader({
    "@/lib/api/server-api": {
      serverApi: {
        request: async (request) => {
          requests.push(request);
          return submissionResponse();
        },
      },
    },
  });
  const { submitProductReview } = load(
    "src/features/reviews/api/product-reviews-api.server",
  );
  const result = await submitProductReview({
    productId: "17",
    locale: "ar",
    accessToken: "server-secret",
    input: { rating: 5, comment: "great product" },
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, "/products/17/reviews");
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].headers.Authorization, "Bearer server-secret");
  assert.equal(requests[0].headers["Accept-Language"], "ar");
  assert.equal(requests[0].headers["X-Cart-Token"], undefined);
  assert.equal(requests[0].retry, false);
  assert.deepEqual(Array.from(requests[0].body.entries()), [
    ["rating", "5"],
    ["comment", "great product"],
  ]);
  for (const forbidden of [
    "product_name",
    "sku",
    "variant_id",
    "order_number",
    "order_item_id",
  ]) {
    assert.equal(requests[0].body.has(forbidden), false);
  }
  assert.equal(result.status, "pending");
});

test("empty optional comment is omitted before the Laravel request", async () => {
  const requests = [];
  const load = sourceLoader({
    "@/lib/api/server-api": {
      serverApi: {
        request: async (request) => {
          requests.push(request);
          return submissionResponse({ comment: null });
        },
      },
    },
  });
  const { submitProductReview } = load(
    "src/features/reviews/api/product-reviews-api.server",
  );
  await submitProductReview({
    productId: "17",
    locale: "en",
    accessToken: "server-secret",
    input: { rating: 4 },
  });
  assert.equal(requests[0].body.get("rating"), "4");
  assert.equal(requests[0].body.has("comment"), false);
});

function routeHarness(environment = "development") {
  const calls = [];
  const logs = [];
  class AuthenticationError extends Error {}
  let behavior = async (...args) => {
    calls.push(args);
    return { status: "pending" };
  };
  const load = sourceLoader({
    console: { error: (...args) => logs.push(args) },
    "next-intl": { hasLocale: (locales, locale) => locales.includes(locale) },
    "@/i18n/routing": { routing: { locales: ["ar", "en"] } },
    "@/features/auth/server/auth-session": { clearAccessToken: async () => {} },
    "@/features/reviews/server/product-reviews-boundary": {
      readProductReviews: async () => ({ ok: false }),
    },
    "@/features/reviews/server/product-review-submission-boundary": {
      ProductReviewAuthenticationError: AuthenticationError,
      submitCurrentUserProductReview: (...args) => behavior(...args),
    },
  }, { process: { env: { NODE_ENV: environment } } });
  const route = load("src/app/api/products/[productId]/reviews/route");
  const { ApiError } = load("src/lib/api/api-error");
  return {
    ...route,
    ApiError,
    AuthenticationError,
    calls,
    logs,
    setBehavior(next) { behavior = next; },
  };
}

async function post(route, {
  productId = "17",
  locale = "en",
  body = { rating: 5, comment: "  great product  " },
} = {}) {
  return route.POST(
    new Request(`https://store.test/api/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Accept-Language": locale, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ productId }) },
  );
}

test("POST BFF validates Product ID, locale, and whole-star browser input", async () => {
  const route = routeHarness();
  for (const productId of ["0", "-1", "1.5", "no", "9007199254740992"]) {
    assert.equal((await post(route, { productId })).status, 400);
  }
  assert.equal((await post(route, { locale: "xx" })).status, 400);
  for (const rating of [0, 6, 2.5, "5", null]) {
    assert.equal((await post(route, { body: { rating } })).status, 400);
  }
  assert.equal(route.calls.length, 0);

  const response = await post(route);
  assert.equal(response.status, 201);
  assert.deepEqual(plain(route.calls[0].slice(0, 3)), [
    "17",
    "en",
    { rating: 5, comment: "great product" },
  ]);
  assert.equal((await response.json()).status, "pending");

  await post(route, { body: { rating: 4, comment: "   " } });
  assert.deepEqual(plain(route.calls[1][2]), { rating: 4 });
});

test("POST BFF maps auth, validation, eligibility, rate, and service errors safely", async () => {
  const cases = [
    [(route) => new route.AuthenticationError(), 401, "auth-required"],
    [
      (route) => new route.ApiError({
        status: 422,
        message: "PRIVATE raw message",
        details: { rating: ["PRIVATE validation"] },
      }),
      422,
      "invalid-input",
    ],
    [
      (route) => new route.ApiError({ status: 422, message: "PRIVATE eligibility" }),
      409,
      "review-not-allowed",
    ],
    [
      (route) => new route.ApiError({ status: 403, message: "PRIVATE forbidden" }),
      403,
      "review-not-allowed",
    ],
    [
      (route) => new route.ApiError({ status: 409, message: "PRIVATE duplicate" }),
      409,
      "review-not-allowed",
    ],
    [
      (route) => new route.ApiError({ status: 429, message: "PRIVATE rate" }),
      429,
      "rate-limited",
    ],
    [
      (route) => new route.ApiError({ status: 500, message: "PRIVATE backend" }),
      503,
      "service-unavailable",
    ],
    [() => new Error("PRIVATE network"), 503, "service-unavailable"],
  ];

  for (const [makeError, status, code] of cases) {
    const route = routeHarness("production");
    const error = makeError(route);
    route.setBehavior(async () => { throw error; });
    const response = await post(route);
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { code });
    assert.doesNotMatch(
      JSON.stringify(route.logs),
      /PRIVATE|validation|eligibility|forbidden|duplicate|backend|network/,
    );
  }
});

test("development diagnostics expose minimal upstream rejection details", async () => {
  for (const upstreamStatus of [403, 409, 422]) {
    const route = routeHarness("development");
    route.setBehavior(async () => {
      throw new route.ApiError({
        status: upstreamStatus,
        message: "Purchase has not been received",
        code: "review_not_allowed",
        details: { eligibility: ["private detail value"] },
      });
    });
    const response = await post(route);
    assert.equal((await response.clone().json()).code, "review-not-allowed");
    assert.deepEqual(plain((await response.json()).errors.debug), {
      upstreamStatus,
      upstreamMessage: "Purchase has not been received",
      upstreamCode: "review_not_allowed",
      upstreamErrorKeys: ["eligibility"],
    });
    const logged = plain(route.logs[0][1]);
    assert.equal(logged.productId, "17");
    assert.equal(logged.backendMessage, "Purchase has not been received");
    assert.deepEqual(logged.backendErrorKeys, ["eligibility"]);
    assert.doesNotMatch(JSON.stringify(route.logs), /private detail value/);
  }
});

test("production diagnostics never expose or log the upstream message", async () => {
  const route = routeHarness("production");
  route.setBehavior(async () => {
    throw new route.ApiError({
      status: 409,
      message: "PRIVATE duplicate-review reason",
      code: "already_reviewed",
      details: { eligibility: ["PRIVATE payload"] },
    });
  });
  const response = await post(route);
  assert.deepEqual(await response.json(), { code: "review-not-allowed" });
  assert.doesNotMatch(JSON.stringify(route.logs), /PRIVATE|already_reviewed|eligibility/);
});

test("development diagnostics redact auth material and submitted Review text", async () => {
  const route = routeHarness("development");
  route.setBehavior(async () => {
    throw new route.ApiError({
      status: 422,
      message: "Bearer server-secret rejected comment great product",
    });
  });
  const response = await post(route, {
    body: { rating: 5, comment: "great product" },
  });
  const serializedResponse = JSON.stringify(await response.json());
  const serializedLogs = JSON.stringify(route.logs);
  for (const serialized of [serializedResponse, serializedLogs]) {
    assert.doesNotMatch(serialized, /server-secret|great product/);
    assert.match(serialized, /\[redacted\]|\[review text redacted\]/);
  }
});

test("unauthenticated POST is rejected without exposing a Bearer token", async () => {
  const route = routeHarness();
  route.setBehavior(async () => { throw new route.AuthenticationError(); });
  const response = await post(route);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { code: "auth-required" });
  assert.doesNotMatch(JSON.stringify(route.logs), /Bearer|token/);
});

test("browser submission makes one JSON BFF request without auth or Cart headers", async () => {
  const requests = [];
  interceptedFetch = async (...args) => {
    requests.push(args);
    return Response.json({ status: "pending" }, { status: 201 });
  };
  const load = sourceLoader({}, { window: { location: { origin: "https://store.test" } } });
  const { submitProductReviewFromBrowser } = load(
    "src/features/reviews/api/submit-product-review.client",
  );
  await submitProductReviewFromBrowser({
    productId: "17",
    locale: "ar",
    input: { rating: 5, comment: "great" },
  });

  assert.equal(requests.length, 1);
  assert.equal(String(requests[0][0]), "https://store.test/api/products/17/reviews");
  assert.equal(requests[0][1].method, "POST");
  assert.equal(requests[0][1].headers["Accept-Language"], "ar");
  assert.equal(requests[0][1].headers.Authorization, undefined);
  assert.equal(requests[0][1].headers["X-Cart-Token"], undefined);
  assert.deepEqual(JSON.parse(requests[0][1].body), {
    rating: 5,
    comment: "great",
  });
});

test("review action keeps one narrow client boundary and guards duplicate submission", () => {
  const actionSource = readFileSync(
    path.join(root, "src/features/reviews/components/order-product-review-action.tsx"),
    "utf8",
  );
  const contentSource = readFileSync(
    path.join(root, "src/features/orders/components/order-details-content.tsx"),
    "utf8",
  );
  const guard = actionSource.indexOf("if (submissionPendingRef.current) return;");
  const lock = actionSource.indexOf("submissionPendingRef.current = true;", guard);
  const request = actionSource.indexOf("await submitProductReviewFromBrowser", lock);
  assert.ok(guard >= 0 && lock > guard && request > lock);
  assert.match(actionSource, /loading=\{pending\}/);
  assert.match(actionSource, /dismissible=\{!pending\}/);
  assert.match(actionSource, /setSubmitted\(true\)/);
  assert.match(actionSource, /submitted \? copy\.pendingReview : copy\.action/);
  assert.doesNotMatch(actionSource, /localStorage|sessionStorage|router\.refresh/);
  assert.match(actionSource, /process\.env\.NODE_ENV === "production"/);
  assert.match(actionSource, /formError\.developmentDiagnostic/);
  assert.doesNotMatch(contentSource, /["']use client["']/);
});

test("pending moderation success stays isolated from public Reviews and aggregates", () => {
  const actionSource = readFileSync(
    path.join(root, "src/features/reviews/components/order-product-review-action.tsx"),
    "utf8",
  );
  assert.match(actionSource, /role="status"[\s\S]*copy\.successBody/);
  assert.doesNotMatch(
    actionSource,
    /getProductReviews|ProductReviewsLoadMore|reviewsCount|ratingSummary|average|breakdown/,
  );
  const pdpSource = readFileSync(
    path.join(root, "src/app/[locale]/(storefront)/products/[slug]/page.tsx"),
    "utf8",
  );
  assert.doesNotMatch(pdpSource, /OrderProductReviewAction|Submit review|Rate product/);
});

test("localized CTA and pending copy are wired for English and Arabic", () => {
  for (const [locale, action, pending] of [
    ["en", "Rate product", "Pending review"],
    ["ar", "قيّم المنتج", "قيد المراجعة"],
  ]) {
    const messages = JSON.parse(
      readFileSync(path.join(root, `src/messages/${locale}/account.json`), "utf8"),
    );
    assert.equal(messages.orders.details.review.action, action);
    assert.equal(messages.orders.details.review.pendingReview, pending);
  }
});

test("no Catalog lookup or SKU/name identity resolution was introduced", () => {
  const reviewedFiles = [
    "src/features/reviews/api/product-reviews-api.server.ts",
    "src/features/reviews/api/submit-product-review.client.ts",
    "src/features/reviews/components/order-product-review-action.tsx",
    "src/app/api/products/[productId]/reviews/route.ts",
  ];
  const source = reviewedFiles
    .map((file) => readFileSync(path.join(root, file), "utf8"))
    .join("\n");
  assert.doesNotMatch(source, /catalog|variantSku|variant_sku|product_name|order_item/i);
  assert.match(source, /productId/);
});
