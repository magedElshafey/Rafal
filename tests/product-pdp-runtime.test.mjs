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
const fixture = JSON.parse(readFileSync(new URL("./fixtures/product-33.json", import.meta.url), "utf8"));
const modules = new Map();
const diagnostics = [];
let response = structuredClone(fixture);
let sourceError = null;
let hooks = null;
let addedLine = null;
const visualStub = new Proxy({}, { get: () => () => null });
const translate = Object.assign((key) => key, { raw: (key) => key });

function loadSource(relativePath) {
  const base = path.join(root, relativePath);
  const filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
  assert.ok(filename, relativePath);
  if (modules.has(filename)) return modules.get(filename).exports;
  const loaded = { exports: {} };
  modules.set(filename, loaded);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    },
  });
  const localRequire = (specifier) => {
    if (specifier === "server-only") return {};
    // Test-only hook dispatcher, matching the existing PDP regression harness.
    /* eslint-disable react-hooks/rules-of-hooks, react-hooks/exhaustive-deps */
    if (specifier === "react") return {
      ...React, cache: (fn) => fn,
      useState: (initial) => {
        if (!hooks) return React.useState(initial);
        const slot = hooks.index++;
        const state = hooks.state;
        if (!(slot in state)) state[slot] = typeof initial === "function" ? initial() : initial;
        return [state[slot], (value) => {
          state[slot] = typeof value === "function" ? value(state[slot]) : value;
        }];
      },
      useRef: (value) => hooks ? { current: value } : React.useRef(value),
      useEffect: (...args) => hooks ? undefined : React.useEffect(...args),
    };
    /* eslint-enable react-hooks/rules-of-hooks, react-hooks/exhaustive-deps */
    if (specifier === "next-intl/server") return { getLocale: async () => "en", getTranslations: async () => translate };
    if (specifier === "next-intl") return { useTranslations: () => translate };
    if (specifier === "next/navigation") return { notFound: () => { throw new Error("NEXT_NOT_FOUND"); } };
    if (specifier === "@tanstack/react-query") return {
      useQueryClient: () => ({}),
      useMutation: () => ({ mutate: (input) => { addedLine = input; }, reset: () => {} }),
    };
    if (specifier === "@/features/products/api/product-api.server") return {
      getProductBySlugDto: async () => {
        if (sourceError) throw sourceError;
        return loadSource("src/features/products/api/parse-product-dto").parseProductDetailsResponse(response);
      },
    };
    if (specifier === "@/features/cart/hooks/use-current-cart") return { useCurrentCart: () => ({ data: { lines: [] } }) };
    if (specifier.startsWith("@/features/cart/")) return {};
    if (specifier === "@/features/location/components/browsing-city-provider") return { useBrowsingCity: () => ({ isChanging: false }) };
    if (specifier === "@/features/location/server/resolve-current-location") return { resolveCurrentLocation: async () => ({ id: 1, name: "City" }) };
    if (specifier === "@/features/location/api/location-api.server") return { resolveLocationByCityId: async () => ({ inCoverage: true, warehouseId: 7, city: { id: 1, name: "City" } }) };
    if (specifier === "@/features/auth/server/auth-boundary") return { getCurrentUser: async () => null };
    if (specifier === "@/config/server-env") return { serverEnv: { siteUrl: new URL("https://rafal.shop"), apiBaseUrl: new URL("https://api.rafal.shop/api/v1") } };
    if (specifier === "@/lib/seo/alternates") return { getLocalizedAlternates: () => ({}) };
    if (specifier === "@/i18n/navigation") return { useRouter: () => ({}), Link: ({ children }) => React.createElement("a", null, children) };
    if (specifier.startsWith("@/components/") || specifier.startsWith("@/features/reviews/") || specifier.startsWith("@/features/wishlist/")) return visualStub;
    if (specifier.startsWith("@/features/products/components/") &&
        !["product-purchase-experience", "product-purchase-panel", "product-price-block", "promotion-countdown"].some((name) => specifier.endsWith(name))) return visualStub;
    return specifier.startsWith("@/") ? loadSource(`src/${specifier.slice(2)}`) : require(specifier);
  };
  // One realm, just like production: plain-object attribute validation is real.
  vm.runInThisContext(`(function(require,module,exports,console){${outputText}\n})`, { filename })(
    localRequire, loaded, loaded.exports,
    { ...console, error: (...args) => diagnostics.push(args) },
  );
  return loaded.exports;
}

const { parseProductDetailsResponse } = loadSource("src/features/products/api/parse-product-dto");
const { mapProductDetailsResponse } = loadSource("src/features/products/api/product-mappers");
const { getProductDetailsBySlug } = loadSource("src/features/products/server/product-boundary");
const { default: ProductPage, generateMetadata } = loadSource("src/app/[locale]/(storefront)/products/[slug]/page");
const { ProductPurchaseExperience } = loadSource("src/features/products/components/product-details/product-purchase-experience");
const { ProductPurchasePanel } = loadSource("src/features/products/components/product-details/product-purchase-panel");
const { resolveProductVariant } = loadSource("src/features/products/utils/product-variant-resolver");
const { assertProductConfiguration } = loadSource("src/features/products/utils/assert-product-configuration");

function elements(tree) {
  const result = [];
  const visit = (element) => {
    if (!React.isValidElement(element)) return;
    result.push(element);
    React.Children.forEach(element.props.children, visit);
  };
  visit(tree);
  return result;
}

async function composePage(payload = fixture) {
  response = structuredClone(payload);
  const params = Promise.resolve({ slug: fixture.data.slug });
  const metadata = await generateMetadata({ params });
  const tree = await ProductPage({ params });
  return { tree, metadata, purchase: elements(tree).find((element) => element.type === ProductPurchaseExperience)?.props };
}

function purchaseRenderer(props) {
  const state = [];
  return (availability = props.availabilityByVariantId) => {
    hooks = { index: 0, state };
    try {
      const tree = ProductPurchaseExperience({ ...props, availabilityByVariantId: availability });
      return elements(tree).find((element) => element.type === ProductPurchasePanel).props;
    } finally { hooks = null; }
  };
}

function attemptAdd(panel) {
  addedLine = null;
  panel.onAddToCart({ currentTarget: {} });
  return addedLine;
}

test("Product 33 exact response parses and crosses the production PDP boundary", async () => {
  response = structuredClone(fixture);
  const parsed = parseProductDetailsResponse(response);
  assert.equal(parsed.data.category, null);
  assert.equal(parsed.data.variants.length, 2);
  assert.deepEqual(parsed.data.variants[0].attributes, {});
  assert.deepEqual(parsed.data.variants[1].attributes, { width: "25" });
  assert.equal(parsed.data.variants[1].sku, "RAF-dcb-3086يسيشي");
  assert.equal((await getProductDetailsBySlug(fixture.data.slug, "en", 1)).id, "33");
  assert.ok(mapProductDetailsResponse(parsed), "valid content must not be discarded for category:null");
  const product = mapProductDetailsResponse(parsed);
  assert.deepEqual(product.personalization, { enabled: false });
  assert.deepEqual(parsed.data.badges, []);
  assert.equal(product.category, null);
  assert.doesNotThrow(() => assertProductConfiguration(product));
  for (const variant of product.variants) {
    assert.deepEqual(variant.imageIds, []);
    assert.deepEqual(variant.pricing, { current: { amount: 115, currency: "SAR" }, compareAt: null, promotion: null });
  }
  assert.deepEqual(product.variants[1].warehouseStocks, []);
  assert.equal(resolveProductVariant(product.variants, {}).id, "54");
  assert.equal(resolveProductVariant(product.variants, { width: "25" }).id, "59");
  assert.equal(resolveProductVariant(product.variants, { width: "missing" }), null);
});

test("Product 33 composes metadata, PDP, selector and purchase; only stocked variant 54 can submit", async () => {
  const { tree, metadata, purchase } = await composePage();
  assert.equal(metadata.title, fixture.data.name);
  const breadcrumbs = elements(tree).find((element) => element.props.items)?.props.items;
  assert.equal(breadcrumbs.length, 2);
  assert.equal(breadcrumbs[1].label, fixture.data.name);
  assert.equal(purchase.availabilityByVariantId["54"].status, "available");
  assert.equal(purchase.availabilityByVariantId["59"].status, "out_of_stock");
  const render = purchaseRenderer(purchase);
  let panel = render();
  assert.equal(panel.variant.id, "54");
  assert.equal(panel.canAddToCart, true);
  assert.equal(panel.personalizationInput, null);
  const markup = renderToStaticMarkup(React.createElement(ProductPurchasePanel, panel));
  assert.ok(markup.includes(fixture.data.name));
  assert.ok(!markup.includes("RAF-dcb-3086يسيشي"));
  assert.match(markup, /value="25"[^>]*disabled/);
  assert.doesNotMatch(markup, /NaN|Invalid Date|configuration invariant/);
  assert.equal(attemptAdd(panel).variantId, "54");
  panel.onSelectOption("width", "25");
  panel = render();
  assert.equal(panel.variant.id, "54");
  assert.equal(attemptAdd(panel).variantId, "54");
  const unavailable = render({});
  assert.equal(unavailable.availability.status, "purchase_unavailable");
  assert.equal(unavailable.canAddToCart, false);
  assert.equal(attemptAdd(unavailable), null);
  assert.doesNotThrow(() => unavailable.onSelectOption("width", "25"));
});

test("PDP robustness matrix renders supported empty, Unicode, attributed and personalized products", async () => {
  const cases = [
    ["one default", (data) => { data.variants = data.variants.slice(0, 1); }, true],
    ["multiple attributed", (data) => {
      data.variants[0].attributes = { width: "20" };
      data.variants[1].warehouse_stocks = [{ warehouse_id: 7, quantity: 5 }];
    }, true],
    ["all unavailable", (data) => { data.variants.forEach((variant) => { variant.warehouse_stocks = []; }); }, false],
    ["no media", (data) => { data.images = []; }, true],
    ["zero variants", (data) => { data.variants = []; }, false],
    ["valid personalization", (data) => { data.is_personalizable = true; data.personalization_max_length = 20; }, false],
    ["duplicate empty combinations", (data) => { data.variants[1].attributes = []; }, false],
    ["duplicate full combinations", (data) => { data.variants.forEach((variant) => { variant.attributes = { width: "25" }; }); }, false],
    ["duplicate IDs", (data) => { data.variants[1].id = 54; }, false],
    ["malformed individual variant", (data) => { data.variants[1].attributes = { width: 25 }; }, true],
  ];
  for (const [name, change, purchasable] of cases) {
    const payload = structuredClone(fixture);
    change(payload.data);
    const { purchase } = await composePage(payload);
    assert.ok(purchase, name);
    const render = purchaseRenderer(purchase);
    const panel = render();
    assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(ProductPurchasePanel, panel)), name);
    assert.equal(panel.canAddToCart, purchasable, name);
    assert.equal(attemptAdd(panel) !== null, purchasable, name);
    if (name.startsWith("duplicate")) {
      panel.onSelectOption("width", "25");
      assert.equal(attemptAdd(render()), null, name);
      assert.equal(resolveProductVariant(purchase.product.variants, name.includes("full") ? { width: "25" } : {}), null);
    }
    if (name === "multiple attributed") {
      panel.onSelectOption("width", "25");
      assert.equal(attemptAdd(render()).variantId, "59");
    }
    if (name === "valid personalization") {
      assert.deepEqual(purchase.product.personalization.allowedLanguages, ["arabic", "english"]);
      panel.onChangePersonalizationText("هدية");
      assert.equal(attemptAdd(render()).personalization.text, "هدية");
    }
  }
});

test("one malformed duplicate ID cannot expose its otherwise valid sibling", async () => {
  const payload = structuredClone(fixture);
  payload.data.variants[1].id = 54;
  payload.data.variants[1].attributes = { width: 25 };
  const { purchase } = await composePage(payload);
  assert.deepEqual(purchase.product.variants, []);
  assert.equal(attemptAdd(purchaseRenderer(purchase)()), null);
});

test("ambiguous combinations block only their own IDs; a unique combination remains purchasable", async () => {
  const payload = structuredClone(fixture);
  payload.data.variants.push({ ...structuredClone(payload.data.variants[0]), id: 60 });
  payload.data.variants[1].warehouse_stocks = [{ warehouse_id: 7, quantity: 2 }];
  const { purchase } = await composePage(payload);
  assert.equal(purchase.availabilityByVariantId["54"].status, "purchase_unavailable");
  assert.equal(purchase.availabilityByVariantId["60"].status, "purchase_unavailable");
  assert.equal(purchase.availabilityByVariantId["59"].status, "available");
  assert.equal(attemptAdd(purchaseRenderer(purchase)()).variantId, "59");
  assert.ok(diagnostics.some(([message]) => message.includes("configuration")));
});

test("unrepresentable catalog contracts render safe PDP state and no purchase experience", async () => {
  for (const change of [
    (payload) => { payload.data.base_price = "broken"; },
    (payload) => { payload.data.variants = null; },
    (payload) => { payload.data.category = {}; },
    (payload) => { payload.data.is_personalizable = true; },
    (payload) => { payload.success = false; },
  ]) {
    const payload = structuredClone(fixture);
    change(payload);
    const { tree, purchase, metadata } = await composePage(payload);
    assert.equal(purchase, undefined);
    const alert = elements(tree).find((element) => element.props.role === "alert");
    const markup = renderToStaticMarkup(alert);
    assert.match(markup, /route.errorTitle/);
    assert.doesNotMatch(markup, /Invalid Product|parser|DTO|Error:|stack|ambiguous/);
    assert.equal(metadata.robots.index, false);
  }
});

test("optional broken media is omitted without discarding a valid variant or crashing metadata", async () => {
  const payload = structuredClone(fixture);
  payload.data.images.push(null, {}, "http://[", "https://unapproved.example/image.jpg", "//unapproved.example/a", "javascript:alert(1)");
  payload.data.variants[0].images = ["https://unapproved.example/variant.jpg"];
  payload.data.variants[1].images = null;
  const { purchase, metadata } = await composePage(payload);
  assert.equal(purchase.product.variants.length, 2);
  assert.deepEqual(purchase.product.images.map((image) => image.src), fixture.data.images);
  assert.ok(purchase.product.variants.every((variant) => variant.imageIds.length === 0));
  assert.equal(metadata.openGraph.images[0].url, fixture.data.images[0]);
});

test("programming exceptions in variant parsing are not swallowed as catalog data", () => {
  const payload = structuredClone(fixture);
  const bug = new TypeError("programmer bug");
  Object.defineProperty(payload.data.variants[0], "sku", { get() { throw bug; } });
  assert.throws(() => parseProductDetailsResponse(payload), (error) => error === bug);
});

test("404 stays not-found; infrastructure and programming failures still reach the error boundary", async () => {
  const { ApiError } = loadSource("src/lib/api/api-error");
  try {
    sourceError = new ApiError({ status: 404, message: "missing" });
    assert.equal(await getProductDetailsBySlug(fixture.data.slug, "en", 1), null);
    for (const error of [new ApiError({ status: 503, message: "unavailable" }), new TypeError("programmer bug")]) {
      sourceError = error;
      await assert.rejects(() => getProductDetailsBySlug(fixture.data.slug, "en", 1), (thrown) => thrown === error);
    }
  } finally { sourceError = null; }
});

test("optional countdown dates and nullable discount metadata never crash rendering", async () => {
  for (const endsAt of [null, "", "invalid-date", "999999999999-01-01"]) {
    const payload = structuredClone(fixture);
    payload.data.discount_end_at = endsAt;
    payload.data.variants[0].discounted_price = "80.00";
    payload.data.variants[0].discounted_price_incl_vat = "92.00";
    const { purchase } = await composePage(payload);
    const panel = purchaseRenderer(purchase)();
    assert.equal(panel.variant.pricing.current.amount, 92);
    assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(ProductPurchasePanel, panel)));
  }
});
