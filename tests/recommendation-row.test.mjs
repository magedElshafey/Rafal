import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup, renderToPipeableStream } from "react-dom/server";
import { PassThrough } from "node:stream";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const messages = Object.fromEntries(["ar", "en"].map((locale) => [locale, JSON.parse(readFileSync(path.join(root, `src/messages/${locale}/common.json`), "utf8"))]));
function harness(read = async () => [], clientLocale = "en") {
  const cache = new Map();
  const cards = [];
  function load(relative) {
    const base = path.join(root, relative);
    const filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = { exports: {} }; cache.set(filename, loaded);
    const output = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const localRequire = (name) => {
      if (name === "server-only") return {};
      if (name === "next-intl") return { useTranslations: (namespace) => {
        const values = namespace.split(".").slice(1).reduce((value, key) => value[key], messages[clientLocale]);
        return (key, params = {}) => key.split(".").reduce((value, part) => value[part], values)
          .replace(/\{(\w+)\}/g, (_, key) => params[key]);
      } };
      if (name === "@tanstack/react-query") return { useQuery: () => { throw new Error("Phase 4A must not observe private cache"); } };
      if (name === "@/features/products/components/recommendations/recommendation-quick-add") return { RecommendationQuickAdd: () => null };
      if (name === "next-intl/server") return { getTranslations: async ({ locale, namespace }) => {
        const values = namespace.split(".").slice(1).reduce((value, key) => value[key], messages[locale]);
        return (key, params = {}) => {
          const value = key.split(".").reduce((value, part) => value[part], values);
          assert.equal(typeof value, "string", key);
          return value.replace(/\{(\w+)\}/g, (_, key) => params[key]);
        };
      } };
      if (name === "@/features/products/server/related-products-boundary") return { getRelatedProducts: read };
      if (name === "@/features/products/components/listing/product-grid") return {
        ListingProductCard: (props) => { cards.push(props); return React.createElement("article", { "data-product": props.product.id }, props.product.name); },
        ProductCardSkeleton: () => React.createElement("div", { "data-skeleton": true }),
      };
      if (name === "@/components/ui/icon-button") return { IconButton: React.forwardRef(function Button({ children, variant: _variant, size: _size, ...props }, ref) { void _variant; void _size; return React.createElement("button", { ...props, ref }, children); }) };
      if (name === "@/components/ui/icons") return { ChevronLeftIcon: () => null, ChevronRightIcon: () => null };
      if (name.startsWith("@/")) return load(`src/${name.slice(2)}`);
      if (name.startsWith(".")) return load(path.relative(root, path.resolve(path.dirname(filename), name)));
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(localRequire, loaded, loaded.exports);
    return loaded.exports;
  }
  return { load, cards };
}
const product = (id) => ({ id: String(id), name: `Product ${id}` }); // Presentation boundary accepts already-mapped products.
const props = { locale: "en", accountId: "account", title: "You may also like", productId: "current", slug: "current" };
const sectionPath = "src/features/products/components/recommendations/product-recommendations-section";
const rowPath = "src/features/products/components/recommendations/recommendation-row";

test("mapped empty hides, one product shows, and more than 10 cap without reordering or deduplicating", async () => {
  for (const ids of [[], [1], [9, 2], [9, 2, 2, 8, 7, 6, 5, 4, 3, 1, 11, 12]]) {
    const { load, cards } = harness(async () => ids.map(product));
    const tree = await load(sectionPath).ProductRecommendationsSection(props);
    if (ids.length === 0) { assert.equal(tree, null); continue; }
    renderToStaticMarkup(tree);
    assert.deepEqual(cards.map((card) => card.product.id), ids.slice(0, 10).map(String));
    assert.ok(cards.every((card) => card.wishlistAccountId === "account" && card.locale === "en"));
  }
});

test("current product exclusion precedes minimum and maximum count decisions", async () => {
  for (const ids of [["current", 1], ["current", 9, 2], ["current", ...Array.from({ length: 11 }, (_, i) => i)]]) {
    const { load, cards } = harness(async (slug, locale, cityId) => {
      assert.equal(slug, "current"); assert.equal(locale, "en"); assert.equal(cityId, 27); return ids.map(product);
    });
    const tree = await load(sectionPath).ProductRecommendationsSection({ ...props, cityId: 27 });
    renderToStaticMarkup(tree);
    assert.deepEqual(cards.map((card) => card.product.id), ids.filter((id) => id !== "current").slice(0, 10).map(String));
  }
});

test("AR/EN rows reuse canonical carousel direction and labels without a View All link", async () => {
  for (const locale of ["ar", "en"]) {
    const { load, cards } = harness(async () => [product(1), product(2)]);
    const title = messages[locale].productDetails.discovery.relatedTitle;
    const html = renderToStaticMarkup(await load(sectionPath).ProductRecommendationsSection({ ...props, locale, title }));
    assert.match(html, new RegExp(`dir="${locale === "ar" ? "rtl" : "ltr"}"`));
    assert.ok(html.includes(title));
    assert.ok(html.includes(messages[locale].productDetails.discovery.previous));
    assert.ok(html.includes(messages[locale].productDetails.discovery.next));
    assert.doesNotMatch(html, /<a /);
    assert.ok(cards[0].ratingLabel("4.0").includes("4.0"));
    const skeleton = renderToStaticMarkup(React.createElement(load(rowPath).RecommendationRowSkeleton, {
      title, loadingLabel: messages[locale].productDetails.discovery.loading,
    }));
    assert.match(skeleton, /role="status"/);
    assert.match(skeleton, /aria-busy="true"/);
    assert.equal((skeleton.match(/data-skeleton/g) ?? []).length, 6);
  }
});

test("pending recommendation read streams a skeleton alongside primary content and hides on failure", async () => {
  let reject;
  const { load } = harness(() => new Promise((_, fail) => { reject = fail; }));
  let result; let complete = false;
  const pending = load(sectionPath).ProductRecommendationsSection(props).then((value) => { result = value; complete = true; });
  function Recommendations() { if (!complete) throw pending; return result; }
  const output = new PassThrough(); let html = "";
  output.on("data", (chunk) => { html += chunk.toString(); });
  const ended = new Promise((resolve, reject) => { output.on("end", resolve); output.on("error", reject); });
  let ready;
  const shell = new Promise((resolve) => { ready = resolve; });
  const stream = renderToPipeableStream(React.createElement("main", null,
    React.createElement("h1", null, "Purchase content"), React.createElement("p", null, "Reviews"),
    React.createElement(React.Suspense, { fallback: React.createElement(load(rowPath).RecommendationRowSkeleton, { title: props.title, loadingLabel: "Loading recommendations" }) }, React.createElement(Recommendations)),
  ), { onShellReady() { stream.pipe(output); ready(); }, onError(error) { output.destroy(error); } });
  await shell;
  assert.match(html, /Purchase content/); assert.match(html, /Reviews/); assert.match(html, /Loading recommendations/);
  reject(new Error("private backend failure"));
  await ended;
  assert.equal(result, null); assert.doesNotMatch(html, /private backend failure/);
});

test("PDP inserts one independent recommendation Suspense after reviews without awaiting its read", () => {
  const source = readFileSync(path.join(root, "src/app/[locale]/(storefront)/products/[slug]/page.tsx"), "utf8");
  assert.equal((source.match(/<ProductRecommendationsSection /g) ?? []).length, 1);
  assert.match(source, /<ProductReviewsSection[^]*?<\/Suspense>[^]*?<Suspense[^]*?RecommendationRowSkeleton[^]*?<ProductRecommendationsSection/);
  assert.doesNotMatch(source, /await getRelatedProducts|<RelatedProducts/);
  assert.match(source, /<ProductRecommendationsSection[^>]*cityId=\{cityId\}/);
});

const cartRowsPath = "src/features/cart/components/cart-recommendations";
const cartProps = { locale: "en", accountId: "account", contextReady: true, cart: { lines: [{ product: { id: "in-cart" } }] } };

test("full Product Resources survive parsing and mapping into independent singleton Cart and PDP rows", async () => {
  const raw = JSON.parse(readFileSync(path.join(root, "tests/fixtures/product-33.json"), "utf8")).data;
  raw.category = { id: 1, name: "Category", slug: "category" };
  for (const locale of ["ar", "en"]) {
    const h = harness(async () => {
      const parsed = h.load("src/features/products/api/parse-product-dto").parseProductRecommendationsResponse({ success: true, message: "OK", data: [raw] });
      return h.load("src/features/products/api/product-mappers").mapRecommendationProducts(parsed.data);
    }, locale);
    const parse = h.load("src/features/cart/api/parse-cart-recommendations").parseCartRecommendationsResponse;
    const map = h.load("src/features/products/api/product-mappers").mapRecommendationProducts;
    const parsed = parse({ success: true, message: "OK", data: { frequently_ordered_with: [raw, raw], related: [raw, raw] } });
    const html = renderToStaticMarkup(h.load(cartRowsPath).CartRecommendationRows({ ...cartProps, locale, read: { status: "success", data: {
      frequentlyOrderedWith: map(parsed.data.frequently_ordered_with), related: map(parsed.data.related),
    } } }));
    assert.equal((html.match(/data-product=/g) ?? []).length, 2);
    assert.ok(html.includes(messages[locale].cartPage.recommendations.frequentlyOrderedWith));
    assert.ok(html.includes(messages[locale].productDetails.discovery.relatedTitle));
    const pdp = renderToStaticMarkup(await h.load(sectionPath).ProductRecommendationsSection({ ...props, locale }));
    assert.equal((pdp.match(/data-product=/g) ?? []).length, 1);
  }
});

test("Cart rows use one response, preserve both backend groups and exclude Cart products", () => {
  const { load, cards } = harness();
  const html = renderToStaticMarkup(load(cartRowsPath).CartRecommendationRows({ ...cartProps, read: { status: "success", data: {
    frequentlyOrderedWith: ["in-cart", 9, 2].map(product), related: [2, "in-cart", 7, 3].map(product),
  } } }));
  assert.deepEqual(cards.map((card) => card.product.id), ["9", "2", "2", "7", "3"]);
  assert.ok(html.indexOf("Often ordered with these products") < html.indexOf("You may also like"));
  assert.ok(cards.every((card) => card.quickAddControl === undefined), "Cart uses default Quick Add");
});

test("Cart Arabic copy and RTL direction use existing localization", () => {
  const { load } = harness(undefined, "ar");
  const html = renderToStaticMarkup(load(cartRowsPath).CartRecommendationRows({ ...cartProps, locale: "ar", read: { status: "success", data: {
    frequentlyOrderedWith: [1, 2].map(product), related: [3, 4].map(product),
  } } }));
  assert.ok(html.includes(messages.ar.cartPage.recommendations.frequentlyOrderedWith));
  assert.ok(html.includes(messages.ar.productDetails.discovery.relatedTitle));
  assert.equal((html.match(/dir="rtl"/g) ?? []).length, 2);
});

test("Cart deduplicates within each row without excluding products shared by backend groups", () => {
  for (const [first, second, expected] of [
    [[1, 1], [1, 1, 2, 2], ["1", "1", "2"]],
    [[], [3, 3, 2, 2], ["3", "2"]],
    [["in-cart", 1, 1, 2], [2, 3, 3, 4], ["1", "2", "2", "3", "4"]],
    [Array.from({ length: 12 }, (_, i) => i + 1), [1, 11, 11, 12], [...Array.from({ length: 10 }, (_, i) => String(i + 1)), "1", "11", "12"]],
  ]) {
    const { load, cards } = harness();
    renderToStaticMarkup(load(cartRowsPath).CartRecommendationRows({ ...cartProps, read: { status: "success", data: {
      frequentlyOrderedWith: first.map(product), related: second.map(product),
    } } }));
    assert.deepEqual(cards.map((card) => card.product.id), expected);
  }
});

test("Cart rows apply independent 0/1/2/10 limits after exclusions", () => {
  for (const firstCount of [0, 1, 2, 10, 12]) {
    for (const secondCount of [0, 1, 2, 10, 12]) {
      const { load, cards } = harness();
      const html = renderToStaticMarkup(load(cartRowsPath).CartRecommendationRows({ ...cartProps, read: { status: "success", data: {
        frequentlyOrderedWith: Array.from({ length: firstCount }, (_, i) => product(i)),
        related: Array.from({ length: secondCount }, (_, i) => product(i + 100)),
      } } }));
      const count = (value) => Math.min(10, value);
      assert.equal(cards.length, count(firstCount) + count(secondCount));
      assert.equal(html.includes("Often ordered with these products"), firstCount > 0);
      assert.equal(html.includes("You may also like"), secondCount > 0);
      if (!firstCount && !secondCount) assert.equal(html, "");
    }
  }
  const { load, cards } = harness();
  renderToStaticMarkup(load(cartRowsPath).CartRecommendationRows({ ...cartProps, read: { status: "success", data: {
    frequentlyOrderedWith: ["in-cart", 1].map(product), related: [1, 2, 3].map(product),
  } } }));
  assert.deepEqual(cards.map((card) => card.product.id), ["1", "1", "2", "3"]);
});

test("Cart empty/context guards and inactive/error states hide cached data without querying", () => {
  const { load } = harness();
  const Rows = load(cartRowsPath).CartRecommendationRows;
  const success = { status: "success", data: { frequentlyOrderedWith: [product(1), product(2)], related: [] } };
  assert.equal(Rows({ ...cartProps, cart: { lines: [] }, read: success }), null);
  assert.equal(Rows({ ...cartProps, contextReady: false, read: success }), null);
  for (const status of ["inactive", "error"]) assert.equal(Rows({ ...cartProps, read: { status } }), null);
  const html = renderToStaticMarkup(Rows({ ...cartProps, read: { status: "loading" } }));
  assert.equal((html.match(/role="status"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /data-product/);
});

test("PDP keeps custom confirmation while Cart reads through its lifecycle owner below summary", async () => {
  const { load, cards } = harness(async () => [product(1), product(2)]);
  renderToStaticMarkup(await load(sectionPath).ProductRecommendationsSection(props));
  assert.ok(cards.every((card) => React.isValidElement(card.quickAddControl)));
  const source = readFileSync(path.join(root, "src/features/cart/components/cart-page.tsx"), "utf8");
  assert.match(source, /\{summarySection\}[^]*?<CartRecommendationRows/);
  assert.match(source, /read=\{recommendationRead\}/);
  assert.match(source, /useCartRecommendations\(/);
  assert.match(source, /contextReady=\{!cityTransitionLocked && fulfillmentCityId !== null && projectionReady\}/);
});
