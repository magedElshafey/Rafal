import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup, renderToPipeableStream } from "react-dom/server";
import { PassThrough } from "node:stream";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);

// Same TypeScript/SSR harness as the existing suite; no browser or Next server.
function sourceLoader(overrides = {}, globals = {}) {
  const modules = new Map();
  function load(relativePath) {
    const base = path.join(root, relativePath);
    const filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    assert.ok(filename, `Resolve ${relativePath}`);
    if (modules.has(filename)) return modules.get(filename).exports;
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
      },
    });
    const loaded = { exports: {} };
    modules.set(filename, loaded);
    vm.runInNewContext(outputText, {
      module: loaded, exports: loaded.exports, URL, Request, Response, AbortController, AbortSignal, DOMException, FormData, setTimeout, ...globals,
      console: overrides.console ?? console,
      require: (specifier) => {
        if (specifier in overrides) return overrides[specifier];
        if (specifier === "server-only") return {};
        if (specifier.startsWith("@phosphor-icons/react")) {
          return new Proxy({}, { get: () => (props) => React.createElement("svg", props) });
        }
        if (specifier === "@/components/ui/icons") {
          return load("src/components/ui/icons/rating-star-icon");
        }
        if (specifier.startsWith(".")) {
          return load(path.relative(root, path.resolve(path.dirname(filename), specifier)));
        }
        return specifier.startsWith("@/") ? load(`src/${specifier.slice(2)}`) : require(specifier);
      },
    }, { filename });
    return loaded.exports;
  }
  return load;
}

const diagnosticLogs = [];
const load = sourceLoader({
  console: { error: (...args) => diagnosticLogs.push(args) },
  "@/features/reviews/components/product-reviews-carousel": {
    ProductReviewsCarousel: ({ children }) => React.createElement("div", { "data-review-carousel": true }, children),
  },
});
const { parseProductReviewsResponse, ProductReviewsContractError } = load("src/features/reviews/api/parse-product-reviews-dto");
const { mapProductReviewsResponse } = load("src/features/reviews/api/product-reviews-mapper");
const { isProductReviewRating } = load("src/features/reviews/utils/is-product-review-rating");
const { ProductReviewsContent } = load("src/features/reviews/components/product-reviews-content");
const { ProductReviewsSkeleton } = load("src/features/reviews/components/product-reviews-skeleton");
const { ProductHeaderRating } = load("src/features/products/components/product-details/product-header-rating");

function response() {
  return {
    success: true, message: "Reviews retrieved successfully",
    data: {
      summary: { average: 5, count: 1, breakdown: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 1 } },
      reviews: [{
        id: 4, rating: 5, comment: "good product", reviewer_display_name: "abdullah e.",
        admin_response: null, helpful_count: 0, photos: [], created_at: "2026-09-23T17:53:47+00:00",
      }],
    },
    meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
  };
}
function page(value = response()) { return mapProductReviewsResponse(parseProductReviewsResponse(value)); }
const copy = {
  titleTemplate: "Ratings and reviews ({count})", title: "Ratings and reviews",
  ratingLabelTemplate: "Rated {value} out of 5", aggregateTemplate: "{average} out of 5 from {count} reviews",
  carouselLabel: "Customer reviews", previous: "Previous reviews", next: "Next reviews",
  position: "Review carousel position", slideLabelTemplate: "Review {current} of {total} by {reviewer}",
  showMore: "Show more reviews", loading: "Loading reviews", loadMoreError: "Try again",
  moreLoadedTemplate: "{count} more reviews loaded", empty: "No reviews for this product yet.",
  pageUnavailable: "No reviews available on this page.",
  readError: "We couldn't load reviews right now.", adminResponse: "Rafal response",
};
function renderReviews(value = response()) {
  return renderToStaticMarkup(React.createElement(ProductReviewsContent, {
    productId: "42", copy, locale: "en", readResult: { ok: true, page: page(value) },
  }));
}

test("parses current response and maps review identity, nullable fields and pagination", () => {
  const input = response();
  input.data.reviews[0].helpful_count = 3;
  input.data.reviews[0].photos = ["https://example.test/storage/review.jpg"];
  input.meta = { current_page: 2, last_page: 9, per_page: 15, total: 121 };
  const result = page(input);
  assert.deepEqual(JSON.parse(JSON.stringify(result.reviews[0])), {
    id: "4", rating: 5, comment: "good product", reviewerDisplayName: "abdullah e.",
    adminResponse: null, helpfulCount: 3, photos: ["https://example.test/storage/review.jpg"],
    createdAt: "2026-09-23T17:53:47+00:00",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result.pagination)), input.meta);
});

test("aggregate accepts 4.25 and does not reconcile breakdown totals", () => {
  const input = response();
  input.data.summary.average = 4.25;
  input.data.summary.count = 150;
  assert.equal(page(input).summary.average, 4.25);
  assert.equal(page(input).summary.count, 150);
});

test("summary average, count and every breakdown bucket are validated", () => {
  for (const invalid of [NaN, Infinity, -0.5, 5.1, "5", null]) {
    const input = response(); input.data.summary.average = invalid;
    assert.throws(() => page(input), ProductReviewsContractError);
  }
  for (const invalid of [-1, 1.5, "1", NaN, Number.MAX_SAFE_INTEGER + 1]) {
    const input = response(); input.data.summary.count = invalid;
    assert.throws(() => page(input), ProductReviewsContractError);
  }
  for (const key of ["1", "2", "3", "4", "5"]) {
    for (const invalid of [undefined, -1, 0.5, "1"]) {
      const input = response(); input.data.summary.breakdown[key] = invalid;
      assert.throws(() => page(input), ProductReviewsContractError);
    }
  }
  for (const invalid of [[], null, 5]) {
    const input = response(); input.data.summary.breakdown = invalid;
    assert.throws(() => page(input), ProductReviewsContractError);
  }
});

test("reusable individual rating rule accepts each half-star and rejects invalid values", () => {
  for (const rating of [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]) {
    const input = response(); input.data.reviews[0].rating = rating;
    assert.ok(isProductReviewRating(rating));
    assert.equal(page(input).reviews[0].rating, rating);
  }
  for (const rating of [0, 2.3, 4.7, 5.5, NaN, Infinity, "2.5", null]) {
    const input = response(); input.data.reviews[0].rating = rating;
    assert.equal(isProductReviewRating(rating), false);
    assert.equal(page(input).reviews.length, 0);
  }
});

test("rejects malformed timestamps including normalized invalid calendar days", () => {
  for (const timestamp of ["bad", "2026-02-30T12:00:00Z", "2026-09-23", "2026-09-23T25:00:00Z", null, 123]) {
    const input = response(); input.data.reviews[0].created_at = timestamp;
    assert.equal(page(input).reviews.length, 0);
  }
  const input = response(); input.data.reviews[0].created_at = "2024-02-29T12:00:00.123Z";
  assert.equal(page(input).reviews[0].createdAt, input.data.reviews[0].created_at);
});

test("photo policy omits malformed entries without discarding valid reviews", () => {
  for (const photo of [{ url: "https://example.test/a.jpg" }, 3, null, "", "/photo.jpg", "not a url", "https:example.test/a.jpg", "https://example.test/a b.jpg", "javascript:alert(1)", "data:image/png;base64,abc", "https://user:pass@example.test/a.jpg"]) {
    const input = response(); input.data.reviews[0].photos = [photo];
    assert.equal(page(input).reviews.length, 1);
    assert.equal(page(input).reviews[0].photos.length, 0);
  }
});

test("validates envelope, identity, names, text, helpful count and pagination", () => {
  for (const [field, invalid] of [["id", 0], ["id", 1.5], ["id", "4"], ["reviewer_display_name", {}], ["comment", {}], ["admin_response", []], ["helpful_count", -1], ["helpful_count", 0.5]]) {
    const input = response(); input.data.reviews[0][field] = invalid;
    assert.equal(page(input).reviews.length, 0);
  }
  for (const key of ["current_page", "last_page", "per_page", "total"]) {
    const input = response(); input.meta[key] = -1;
    assert.throws(() => page(input), ProductReviewsContractError);
  }
  const input = response(); input.success = false;
  assert.throws(() => page(input), ProductReviewsContractError);
});

test("nullable comment compatibility and empty reviews remain valid", () => {
  const input = response(); input.data.reviews[0].comment = null;
  assert.equal(page(input).reviews[0].comment, null);
  input.data.summary = { average: 0, count: 0, breakdown: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } };
  input.data.reviews = []; input.meta.total = 0;
  assert.match(renderReviews(input), /No reviews for this product yet/);
  assert.match(renderReviews(input), /Ratings and reviews \(0\)/);
});

test("zero, one and many review states only enable the carousel when useful", () => {
  const empty = response();
  empty.data.summary = { average: 0, count: 0, breakdown: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } };
  empty.data.reviews = []; empty.meta.total = 0;
  assert.doesNotMatch(renderReviews(empty), /data-review-carousel/);

  assert.doesNotMatch(renderReviews(), /data-review-carousel/);

  const many = response();
  many.data.summary.count = 2;
  many.data.reviews.push({ ...many.data.reviews[0], id: 5, reviewer_display_name: "sara a." });
  many.meta.total = 2;
  const html = renderReviews(many);
  assert.match(html, /data-review-carousel="true"/);
  assert.match(html, /abdullah e\./);
  assert.match(html, /sara a\./);
});

test("SSR section keeps first-page review content in the many-review carousel", () => {
  const input = response(); input.data.summary.count = 40; input.meta.last_page = 3;
  input.data.reviews[0].photos = ["https://example.test/storage/photo.jpg"];
  const html = renderReviews(input);
  assert.match(html, /Ratings and reviews \(40\)/);
  assert.match(html, /id="reviews"/);
  assert.match(html, /aria-labelledby="product-reviews-title"/);
  assert.match(html, /abdullah e\./);
  assert.match(html, /good product/);
  assert.match(html, /aria-label="Rated 5 out of 5"/);
  assert.match(html, /data-review-carousel="true"/);
  assert.doesNotMatch(html, /<input|<form|<img|<time|rel="preload"|Helpful|Report|Upload|Rafal response/);
  assert.equal(page(input).reviews[0].createdAt, "2026-09-23T17:53:47+00:00");
});

test("SSR comments, names and optional admin response remain escaped plain text", () => {
  const input = response();
  input.data.reviews[0].reviewer_display_name = "<b>name</b>";
  input.data.reviews[0].comment = '<script>alert("x")</script>';
  input.data.reviews[0].admin_response = "<img src=x>Thank you";
  const html = renderReviews(input);
  assert.match(html, /Rafal response/);
  assert.match(html, /&lt;b&gt;name/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img src=x&gt;Thank you/);
  assert.doesNotMatch(html, /<script|<img/);
});

test("fractional stars have one accessible label, five decorative stars and proportional fill", () => {
  for (const value of [2.5, 4.25]) {
    const html = renderToStaticMarkup(React.createElement(ProductHeaderRating, {
      summary: { average: value, count: 23 }, locale: "en",
      ratingLabelTemplate: copy.ratingLabelTemplate, ratingSummaryTemplate: "{average} out of 5 ({count} ratings)",
    }));
    assert.match(html, new RegExp(`aria-label="Rated ${value} out of 5"`));
    assert.equal((html.match(/role="img"/g) ?? []).length, 1);
    assert.equal((html.match(/class="relative size-/g) ?? []).length, 5);
    assert.match(html, value === 2.5 ? /width:50%/ : /width:25%/);
    assert.match(html, /href="#reviews"/);
    assert.match(html, /23 ratings/);
  }
  const html = renderToStaticMarkup(React.createElement(ProductHeaderRating, {
    summary: { average: 5, count: 0 }, locale: "en",
    ratingLabelTemplate: copy.ratingLabelTemplate, ratingSummaryTemplate: "{average} out of 5 ({count} ratings)",
  }));
  assert.match(html, /data-rating-value="0"/);
  assert.doesNotMatch(html, /width:100%/);
});

test("public read uses product identity, locale, shared query and maps only one page", async () => {
  const requests = [];
  const controller = new AbortController();
  const apiLoad = sourceLoader({ "@/lib/api/server-api": { serverApi: { request: async (request) => { requests.push(request); return response(); } } } });
  const { getProductReviews } = apiLoad("src/features/reviews/api/product-reviews-api.server");
  const result = await getProductReviews({ productId: "42", locale: "ar", signal: controller.signal });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, "/products/42/reviews");
  assert.equal(requests[0].headers["Accept-Language"], "ar");
  assert.equal(requests[0].headers.Authorization, undefined);
  assert.equal(requests[0].query.page, 1);
  assert.equal(requests[0].signal, controller.signal);
  assert.equal(result.reviews[0].id, "4");
});

test("network and contract failures become local fallback with safe diagnostics", async () => {
  for (const failure of ["request", "contract"]) {
    const logs = [];
    const boundaryLoad = sourceLoader({
      console: { error: (...args) => logs.push(args) },
      "@/lib/api/server-api": { serverApi: { request: async () => {
        if (failure === "request") throw new Error("private backend detail");
        const input = response(); input.data.summary.average = 6; return input;
      } } },
    });
    const { readProductReviews } = boundaryLoad("src/features/reviews/server/product-reviews-boundary");
    const result = await readProductReviews("42", "en");
    assert.equal(result.ok, false);
    assert.equal(logs.length, 1);
    assert.equal(logs[0][1].kind, failure);
    assert.doesNotMatch(JSON.stringify(logs), /private backend detail|good product/);
    const html = renderToStaticMarkup(React.createElement(ProductReviewsContent, { productId: "42", copy, locale: "en", readResult: result }));
    assert.match(html, /load reviews right now/);
    assert.doesNotMatch(html, /private backend detail|Invalid Product|\(0\)/);
  }
});

test("skeleton reserves responsive carousel cards with accessible loading and reduced-motion safe primitive", () => {
  const html = renderToStaticMarkup(React.createElement(ProductReviewsSkeleton, { title: copy.title, loadingLabel: "Loading reviews" }));
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /role="status"/);
  assert.match(html, /motion-reduce:animate-none/);
  assert.match(html, /overflow-hidden/);
  assert.match(html, /basis-\[88%\]/);
  assert.match(html, /xl:basis-1\/3/);
});

test("PDP keeps reviews behind Suspense and header wired to Product resource; cards stay server-only", () => {
  const source = readFileSync(path.join(root, "src/app/[locale]/(storefront)/products/[slug]/page.tsx"), "utf8");
  assert.match(source, /<Suspense[\s\S]*<ProductReviewsSection productId=\{product.id\} locale=\{locale\}/);
  assert.doesNotMatch(source, /await (?:getProductReviews|readProductReviews)|["']use client["']/);
  assert.match(source, /ratingSummary: product.ratingSummary/);
  const panel = readFileSync(path.join(root, "src/features/products/components/product-details/product-purchase-panel.tsx"), "utf8");
  assert.match(panel, /<ProductHeaderRating\s+summary=\{product.ratingSummary\}/);
  for (const file of readdirSync(path.join(root, "src/features/reviews/components")).filter((name) => !["product-reviews-carousel.tsx", "order-product-review-action.tsx", "product-review-rating-input.tsx"].includes(name))) {
    assert.doesNotMatch(readFileSync(path.join(root, "src/features/reviews/components", file), "utf8"), /["']use client["']|useEffect|useState/);
  }
});

test("streaming shell renders purchase content while review read is pending and survives failure", async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const logs = [];
  const streamingLoad = sourceLoader({
    console: { error: (...args) => logs.push(args) },
    "@/lib/api/server-api": { serverApi: { request: async () => { await pending; throw new Error("failure"); } } },
  });
  const { readProductReviews } = streamingLoad("src/features/reviews/server/product-reviews-boundary");
  const read = readProductReviews("42", "en");
  function Reviews() {
    return React.createElement(ProductReviewsContent, { productId: "42", copy, locale: "en", readResult: React.use(read) });
  }
  const output = new PassThrough();
  let html = "";
  output.on("data", (chunk) => { html += chunk.toString(); });
  const completed = new Promise((resolve, reject) => { output.on("end", resolve); output.on("error", reject); });
  let shellReady;
  const shell = new Promise((resolve) => { shellReady = resolve; });
  const stream = renderToPipeableStream(React.createElement("main", null,
    React.createElement("button", null, "Add to cart"),
    React.createElement(React.Suspense, { fallback: React.createElement(ProductReviewsSkeleton, { title: copy.title, loadingLabel: "Loading reviews" }) }, React.createElement(Reviews)),
  ), { onShellReady() { stream.pipe(output); shellReady(); }, onError(error) { output.destroy(error); } });
  await shell;
  assert.match(html, /Add to cart/);
  assert.match(html, /Loading reviews/);
  assert.doesNotMatch(html, /load reviews right now/);
  release();
  await completed;
  assert.match(html, /load reviews right now/);
  assert.equal(logs.length, 1);
});

test("malformed second review is isolated, preserves global count and emits only structural diagnostics", () => {
  diagnosticLogs.length = 0;
  const input = response();
  input.data.summary.count = 100;
  input.data.reviews.push({ ...input.data.reviews[0], id: 5, rating: 2.3,
    comment: "PRIVATE COMMENT", reviewer_display_name: "PRIVATE NAME", admin_response: "PRIVATE RESPONSE",
    photos: ["https://private.test/photo.jpg"],
  });
  const result = page(input);
  assert.equal(result.reviews.length, 1);
  assert.equal(result.reviews[0].id, "4");
  assert.equal(result.summary.count, 100);
  assert.match(renderReviews(input), /Ratings and reviews \(100\)/);
  assert.equal(diagnosticLogs[0][1].reviewIndex, 1);
  assert.equal(diagnosticLogs[0][1].path, "data.reviews[1].rating");
  assert.doesNotMatch(JSON.stringify(diagnosticLogs), /PRIVATE|private.test/);
});

test("invalid photo collection becomes empty and mixed photo items retain valid URLs only", () => {
  diagnosticLogs.length = 0;
  for (const value of [null, undefined, {}, "PRIVATE URL"]) {
    const input = response(); input.data.reviews[0].photos = value;
    const result = page(input);
    assert.equal(result.reviews.length, 1);
    assert.equal(result.reviews[0].photos.length, 0);
  }
  const input = response();
  input.data.reviews[0].photos = ["https://example.test/storage/photo.jpg", { private: "PRIVATE URL" }, "javascript:PRIVATE"];
  assert.deepEqual(Array.from(page(input).reviews[0].photos), ["https://example.test/storage/photo.jpg"]);
  assert.ok(diagnosticLogs.every((entry) => entry[1].reviewId === 4));
  assert.doesNotMatch(JSON.stringify(diagnosticLogs), /PRIVATE|example.test/);
});

test("all excluded rows do not imply a globally empty product", () => {
  const input = response(); input.data.reviews[0].id = 0;
  const html = renderReviews(input);
  assert.match(html, /Ratings and reviews \(1\)/);
  assert.match(html, /No reviews available on this page/);
  assert.doesNotMatch(html, /No reviews for this product yet/);
});

const loadMoreCopy = { ...copy, error: copy.loadMoreError, loadedTemplate: copy.moreLoadedTemplate };
function laterPage(current, last, ids) {
  const input = response();
  input.meta.current_page = current; input.meta.last_page = last;
  input.data.reviews = ids.map((id) => ({ ...input.data.reviews[0], id, comment: `Review ${id}` }));
  return page(input);
}

function loadMoreHarness(request) {
  const slots = [];
  let cursor = 0;
  let cleanup;
  const hooks = {
    ...React,
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useEffect(callback) { cleanup = callback(); },
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], (value) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
  };
  const clientLoad = sourceLoader({ react: hooks,
    "@/features/reviews/api/get-product-reviews.client": { getProductReviewsClient: request },
    "@/components/ui/app-carousel": new Proxy({}, { get: () => ({ children }) => React.createElement("div", null, children) }),
  });
  const { ProductReviewsCarousel } = clientLoad("src/features/reviews/components/product-reviews-carousel");
  const props = {
    productId: "42", locale: "en", initialNextPage: 2, lastPage: 3,
    initialReviewIds: ["4"], initialSlideLabels: ["Review 1"], totalReviews: 5, copy: loadMoreCopy,
    children: React.createElement("article", null, "Page 1 review"),
  };
  let tree;
  const render = () => { cursor = 0; tree = ProductReviewsCarousel(props); return tree; };
  const all = (node = tree) => React.isValidElement(node)
    ? [node, ...React.Children.toArray(node.props.children).flatMap((child) => all(child))] : [];
  render();
  return {
    render,
    button: () => all().find((node) => typeof node.props.onClick === "function"),
    reviews: () => all().filter((node) => node.props.review).map((node) => node.props.review.id),
    message: () => all().find((node) => node.props.role === "status").props.children,
    error: () => all().find((node) => node.props.role === "alert"),
    markup: () => renderToStaticMarkup(tree),
    unmount: () => cleanup(),
  };
}

test("rapid clicks request exactly page 2 once, then append backend order and deduplicate all seen IDs", async () => {
  let resolve;
  const calls = [];
  const harness = loadMoreHarness((request) => {
    calls.push(request);
    return new Promise((done) => { resolve = done; });
  });
  const first = harness.button().props.onClick();
  await harness.button().props.onClick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].page, 2);
  harness.render();
  assert.equal(harness.button().props.loading, true);
  assert.equal(harness.button().props.disabled, true);
  assert.deepEqual(harness.reviews(), []);
  resolve(laterPage(2, 3, [4, 8, 7, 8]));
  await first;
  harness.render();
  assert.deepEqual(harness.reviews(), ["8", "7"]);
  assert.equal(harness.message(), "2 more reviews loaded");
  const next = harness.button().props.onClick();
  assert.equal(calls[1].page, 3);
  resolve(laterPage(3, 3, [7, 9]));
  await next;
  harness.render();
  assert.deepEqual(harness.reviews(), ["8", "7", "9"]);
  assert.equal(harness.button(), undefined);
  assert.equal(calls.length, 2);
});

test("later-page failure preserves SSR and appended cards, then retries the same page only on click", async () => {
  let fail = true;
  const calls = [];
  const harness = loadMoreHarness(async ({ page: requested }) => {
    calls.push(requested);
    if (fail) throw new Error("private backend text");
    return laterPage(requested, 4, [requested + 4]);
  });
  await harness.button().props.onClick(); harness.render();
  assert.deepEqual(calls, [2]);
  assert.ok(harness.error());
  assert.equal(harness.button().props.disabled, false);
  assert.match(renderReviews(), /good product/);
  assert.match(harness.markup(), /Try again/);
  assert.doesNotMatch(harness.markup(), /private backend text/);
  fail = false;
  await harness.button().props.onClick(); harness.render();
  assert.deepEqual(calls, [2, 2]);
  assert.deepEqual(harness.reviews(), ["6"]);
  fail = true;
  await harness.button().props.onClick(); harness.render();
  assert.deepEqual(calls, [2, 2, 3]);
  assert.deepEqual(harness.reviews(), ["6"]);
});

test("incorrect returned page leaves the next page unchanged; unmount aborts without appending", async () => {
  const calls = [];
  const harness = loadMoreHarness(async (request) => { calls.push(request); return laterPage(1, 3, [8]); });
  await harness.button().props.onClick(); harness.render();
  assert.ok(harness.error());
  assert.deepEqual(harness.reviews(), []);
  await harness.button().props.onClick();
  assert.deepEqual(calls.map((call) => call.page), [2, 2]);
  let resolve;
  let signal;
  const abortHarness = loadMoreHarness((request) => { signal = request.signal; return new Promise((done) => { resolve = done; }); });
  const pending = abortHarness.button().props.onClick();
  abortHarness.unmount();
  assert.equal(signal.aborted, true);
  resolve(laterPage(2, 3, [8])); await pending;
  abortHarness.render();
  assert.deepEqual(abortHarness.reviews(), []);
});

test("async server section passes SSR Page 1 cards and pagination into one carousel", async () => {
  for (const lastPage of [1, 3]) {
    const input = response(); input.data.summary.count = 40; input.meta.last_page = lastPage;
    const t = (key) => ({
      "reviews.heading": copy.title, "reviews.empty": copy.empty, "reviews.readError.title": copy.readError,
      "reviews.adminResponse": copy.adminResponse, "reviews.showMore": loadMoreCopy.showMore,
      "reviews.loading": loadMoreCopy.loading, "reviews.loadMoreError": loadMoreCopy.error,
      "reviews.pageUnavailable": copy.pageUnavailable, "reviews.carouselLabel": copy.carouselLabel,
      "reviews.previous": copy.previous, "reviews.next": copy.next, "reviews.position": copy.position,
    })[key];
    t.raw = (key) => ({
      "reviews.title": copy.titleTemplate, "rating.label": copy.ratingLabelTemplate,
      "reviews.aggregate": copy.aggregateTemplate, "reviews.slideLabel": copy.slideLabelTemplate,
      "reviews.moreLoaded": loadMoreCopy.loadedTemplate,
    })[key];
    let carouselProps;
    const sectionLoad = sourceLoader({
      "@/features/reviews/server/product-reviews-boundary": { readProductReviews: async () => ({ ok: true, page: page(input) }) },
      "next-intl/server": { getTranslations: async () => t },
      "@/features/reviews/components/product-reviews-carousel": {
        ProductReviewsCarousel: (props) => {
          carouselProps = props;
          return React.createElement("div", null, props.children, props.initialNextPage === null ? null : props.copy.showMore);
        },
      },
    });
    const { ProductReviewsSection } = sectionLoad("src/features/reviews/components/product-reviews-section");
    const html = renderToStaticMarkup(await ProductReviewsSection({ productId: "42", locale: "en" }));
    assert.equal(html.includes("Show more reviews"), lastPage > 1);
    assert.match(html, /good product/);
    assert.equal(carouselProps.initialNextPage, lastPage > 1 ? 2 : null);
    assert.deepEqual(Array.from(carouselProps.initialReviewIds), ["4"]);
    assert.match(renderToStaticMarkup(carouselProps.children), /good product/);
  }
});

test("many-review UI reuses the canonical deferred RTL-aware carousel with responsive slides", () => {
  const source = readFileSync(path.join(root, "src/features/reviews/components/product-reviews-carousel.tsx"), "utf8");
  assert.match(source, /from "@\/components\/ui\/app-carousel"/);
  assert.match(source, /direction=\{locale === "ar" \? "rtl" : "ltr"\}/);
  assert.match(source, /deferUntilNearViewport/);
  assert.match(source, /basis-\[88%\][\s\S]*sm:basis-\[58%\][\s\S]*lg:basis-1\/2[\s\S]*xl:basis-1\/3/);
  assert.match(source, /<AppCarouselPrevious[\s\S]*<AppCarouselPosition[\s\S]*<AppCarouselNext/);
});

test("internal public route validates ID/page/locale before reading and returns no-store normalized data", async () => {
  const calls = [];
  const routeLoad = sourceLoader({
    "next-intl": { hasLocale: (locales, locale) => locales.includes(locale) },
    "@/i18n/routing": { routing: { locales: ["ar", "en"] } },
    "@/features/reviews/server/product-reviews-boundary": { readProductReviews: async (...args) => { calls.push(args); return { ok: true, page: laterPage(2, 3, [7]) }; } },
    "@/features/reviews/server/product-review-submission-boundary": { ProductReviewAuthenticationError: class extends Error {}, submitCurrentUserProductReview: async () => { throw new Error("not used by GET"); } },
    "@/features/auth/server/auth-session": { clearAccessToken: async () => {} },
  });
  const { GET } = routeLoad("src/app/api/products/[productId]/reviews/route");
  for (const [id, query, locale] of [["0", "2", "en"], ["no", "2", "en"], ["42", "0", "en"], ["42", "-1", "en"], ["42", "1.5", "en"], ["42", "02", "en"], ["42", "9007199254740992", "en"], ["42", "2&page=3", "en"], ["42", "2", "xx"], ["42", "", "en"]]) {
    const response = await GET(new Request(`https://store.test/api/products/${id}/reviews?page=${query}`, { headers: { "Accept-Language": locale } }), { params: Promise.resolve({ productId: id }) });
    assert.equal(response.status, 400);
  }
  assert.equal(calls.length, 0);
  const result = await GET(new Request("https://store.test/api/products/42/reviews?page=2", { headers: { "Accept-Language": "ar", Authorization: "ignored", "X-Cart-Token": "ignored" } }), { params: Promise.resolve({ productId: "42" }) });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "private, no-store");
  assert.equal((await result.json()).reviews[0].reviewerDisplayName, "abdullah e.");
  assert.equal(calls[0][0], "42");
  assert.equal(calls[0][1], "ar");
  assert.equal(calls[0][2].page, 2);
  assert.equal(calls[0][2].retry, false);
  assert.deepEqual(Object.keys(calls[0][2]).sort(), ["page", "retry", "signal"]);
});

test("server read rejects mismatched pagination and localizes public route failure", async () => {
  const routeLoad = sourceLoader({
    console: { error() {} },
    "next-intl": { hasLocale: (locales, locale) => locales.includes(locale) },
    "@/i18n/routing": { routing: { locales: ["ar", "en"] } },
    "@/lib/api/server-api": { serverApi: { request: async () => response() } },
    "@/features/reviews/server/product-review-submission-boundary": { ProductReviewAuthenticationError: class extends Error {}, submitCurrentUserProductReview: async () => { throw new Error("not used by GET"); } },
    "@/features/auth/server/auth-session": { clearAccessToken: async () => {} },
  });
  const { GET } = routeLoad("src/app/api/products/[productId]/reviews/route");
  const result = await GET(new Request("https://store.test/api/products/42/reviews?page=2", { headers: { "Accept-Language": "en" } }), { params: Promise.resolve({ productId: "42" }) });
  assert.equal(result.status, 503);
  assert.deepEqual(await result.json(), { code: "reviews-unavailable" });
});

test("browser public request uses internal URL and one attempt on HTTP/network failure", async () => {
  for (const failure of ["http", "network", null]) {
    const requests = [];
    const clientLoad = sourceLoader({}, {
      window: { location: { origin: "https://store.test" } },
      fetch: async (url, options) => {
        requests.push({ url: String(url), options });
        if (failure === "network") throw new TypeError("network error");
        return Response.json(failure ? { message: "Unavailable" } : laterPage(2, 3, [8]), { status: failure ? 503 : 200 });
      },
    });
    const { getProductReviewsClient } = clientLoad("src/features/reviews/api/get-product-reviews.client");
    const read = getProductReviewsClient({ productId: "42", page: 2, locale: "ar" });
    if (failure) await assert.rejects(read); else assert.equal((await read).reviews[0].id, "8");
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "https://store.test/api/products/42/reviews?page=2");
    assert.equal(requests[0].options.headers["Accept-Language"], "ar");
    assert.equal(requests[0].options.headers.Authorization, undefined);
    assert.equal(requests[0].options.headers["X-Cart-Token"], undefined);
  }
});

test("shared transport opt-out makes one upstream attempt while default GET retry policy remains intact", async () => {
  for (const failure of ["http", "network"]) {
    let attempts = 0;
    const transportLoad = sourceLoader({}, {
      setTimeout: (callback) => { callback(); },
      fetch: async () => {
        attempts++;
        if (failure === "network") throw new TypeError("network");
        return Response.json({}, { status: 503 });
      },
    });
    const { createHttpClient } = transportLoad("src/lib/api/http-client");
    const api = createHttpClient({ baseUrl: new URL("https://backend.test") });
    await assert.rejects(api.request({ path: "/reviews", retry: false }));
    assert.equal(attempts, 1);
    attempts = 0;
    await assert.rejects(api.request({ path: "/reviews" }));
    assert.equal(attempts, 3);
  }
});
