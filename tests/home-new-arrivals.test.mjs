import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "next-intl";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const homeComponents = "@/features/home/components/";
const realHomeComponents = ["latest-products-section", "best-sellers-section", "product-collection-section", "product-shelf", "home-product-card"];
const forbidden = () => assert.fail("Network and mutations are forbidden in Home regression tests");

function harness(locale = "ar") {
  const calls = [];
  const diagnostics = [];
  const modules = new Map();
  let payload;
  let cityId = 801;
  const context = vm.createContext({
    console: { error: (...args) => diagnostics.push(args) },
    URL, fetch: forbidden,
  });
  const t = createTranslator({ locale, messages: JSON.parse(readFileSync(path.join(root, `src/messages/${locale}/home.json`), "utf8")), namespace: "productSections" });
  const empty = () => null;
  const passThrough = ({ children, className }) => React.createElement("div", { className }, children);
  const mocks = {
    "server-only": {},
    "next-intl": { useLocale: () => locale, useTranslations: () => t },
    "next-intl/server": { getLocale: async () => locale, getTranslations: async () => t },
    "@/i18n/routing": { routing: { locales: ["ar", "en"] } },
    "@/i18n/navigation": { Link: ({ href, children, ...props }) => React.createElement("a", { ...props, href: `/${locale}${href}` }, children) },
    "@/features/auth/server/auth-boundary": { getCurrentUser: async () => null },
    "@/features/location/server/resolve-current-location": { resolveCurrentLocation: async () => cityId === null ? null : { id: cityId } },
    "@/features/products/api/optional-auth-product-read": {
      optionalAuthProductRead: async (requestedLocale, request) => {
        calls.push({ locale: requestedLocale, ...request });
        return payload;
      },
    },
    // Keep real shelf/card markup; isolate carousel runtime and commerce controls.
    "@/components/ui/app-carousel": {
      AppCarousel: ({ direction, label, children }) => React.createElement("div", { dir: direction, "aria-label": label }, children),
      AppCarouselContent: passThrough, AppCarouselViewport: passThrough,
      AppCarouselSlide: passThrough, AppCarouselNext: empty, AppCarouselPrevious: empty,
    },
    "@/components/ui/icons": new Proxy({}, { get: () => empty }),
    "@phosphor-icons/react": new Proxy({}, { get: () => empty }),
    "next/image": { __esModule: true, default: ({ src, alt }) => React.createElement("img", { src, alt }) },
    "@/features/wishlist/components/wishlist-heart": { WishlistHeart: empty },
    "@/features/products/components/product-card/product-quick-add-control": {
      ProductQuickAddControl: ({ disabled, productId }) => React.createElement("button", { disabled, "data-quick-add": productId }, "Add"),
    },
  };
  function load(relative) {
    const base = path.join(root, relative);
    const filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    assert.ok(filename, relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loaded = { exports: {} };
    modules.set(filename, loaded);
    const code = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    vm.runInContext(`(function(require, module, exports) {${code}\n})`, context, { filename })((specifier) => {
      if (specifier in mocks) return mocks[specifier];
      if (specifier.startsWith("@phosphor-icons/react/")) return new Proxy({}, { get: () => empty });
      if (specifier.startsWith(homeComponents) && !realHomeComponents.includes(specifier.slice(homeComponents.length))) {
        return new Proxy({}, { get: () => empty });
      }
      if (specifier.startsWith("@/features/categories/components/")) return new Proxy({}, { get: () => empty });
      if (specifier.startsWith("@/features/products/components/product-card/") && specifier.endsWith("product-secondary-media")) return { ProductSecondaryMedia: empty };
      if (specifier.startsWith("@/features/cart/") || specifier.startsWith("@/config/") || specifier === "@/lib/api/server-api") throw Error(`Unexpected I/O dependency: ${specifier}`);
      if (specifier.startsWith("@/")) return load(`src/${specifier.slice(2)}`);
      if (specifier.startsWith(".")) {
        if (specifier.endsWith("product-secondary-media")) return { ProductSecondaryMedia: empty };
        return load(path.relative(root, path.resolve(path.dirname(filename), specifier)));
      }
      assert.ok(["react", "react/jsx-runtime", "class-variance-authority", "clsx", "tailwind-merge"].includes(specifier), specifier);
      return require(specifier);
    }, loaded, loaded.exports);
    return loaded.exports;
  }
  const { getHomeData } = load("src/features/home/api/get-home-data");
  const { LatestProductsSection } = load("src/features/home/components/latest-products-section");
  const { default: HomePage } = load("src/app/[locale]/(storefront)/page");
  return {
    calls, diagnostics,
    setResponse(value, nextCityId = cityId) {
      payload = vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(value))})`, context);
      cityId = nextCityId;
    },
    read: () => getHomeData(cityId, locale),
    latest: (home) => renderToStaticMarkup(React.createElement(LatestProductsSection, { accountId: null, products: home.newArrivals, categories: home.categories })),
    async page() {
      const tree = await HomePage();
      const latest = React.Children.toArray(tree.props.children).find((node) => node.type === LatestProductsSection);
      // Resolve server section functions, leaving the real client section to
      // React SSR so useState retains its normal initial-render behavior.
      const children = await Promise.all(React.Children.toArray(tree.props.children).map(async (node) =>
        typeof node.type === "function" && node.type.constructor.name === "AsyncFunction" ? await node.type(node.props) : node));
      return { latest, html: renderToStaticMarkup(React.createElement("main", null, ...children)) };
    },
  };
}

// Synthetic IDs deliberately differ from the real catalog and warehouse.
function product(id, warehouseId = 701, legacy = false, quantity = 8) {
  return {
    id, sku: `SYNTH-${id}`, name: `Synthetic ${id}`, slug: `synthetic-${id}`,
    description: null, base_price: "100.00", discount_percentage: null, discount_end_at: null,
    badges: [], is_personalizable: false, is_wishlist: false,
    personalization_max_length: null, personalization_fee: null,
    viewers_now: 0, times_ordered: 0, rating_average: 4, reviews_count: 2,
    images: [`https://example.invalid/${id}.jpg`],
    category: { id: 901, name: "Synthetic category", slug: "synthetic-category" },
    variants: [{
      id: id + 100, sku: `VAR-${id}`, attributes: legacy ? [] : { size: "M" },
      effective_price: "100.00", effective_price_incl_vat: "115.00",
      discounted_price: null, discounted_price_incl_vat: null, images: [],
      warehouse_stocks: [{ warehouse_id: warehouseId, quantity }],
    }],
  };
}

function response(warehouseId = 701) {
  return {
    success: true, message: "Synthetic response",
    data: {
      location: { in_coverage: true, warehouse_id: warehouseId, city: { id: 801, name: "Synthetic city" }, region: { id: 802, name: "Synthetic region" }, message: null },
      new_arrivals: [product(904, warehouseId), product(902, warehouseId), product(907, warehouseId, true), product(901, warehouseId, true)],
      best_sellers: [product(910, warehouseId)], featured: [product(911, warehouseId)],
      on_discount: [], personalizable: [], categories: [], banners: [], testimonials: [], why_rafal: [],
    },
  };
}

for (const [locale, heading, direction] of [["ar", "المضاف حديثاً", "rtl"], ["en", "New Arrivals", "ltr"]]) {
  test(`${locale}: Home renders four arrivals in API order with localized heading and ${direction}`, async () => {
    const h = harness(locale);
    h.setResponse(response());
    const home = await h.read();
    assert.deepEqual(Array.from(home.newArrivals, (p) => p.id), ["904", "902", "907", "901"]);
    const html = h.latest(home);
    assert.ok(html.includes(heading));
    assert.match(html, new RegExp(`dir="${direction}"`));
    assert.deepEqual([...html.matchAll(/href="[^\"]*\/products\/synthetic-(\d+)"/g)].map((match) => match[1]), ["904", "902", "907", "901"]);
    const page = await h.page();
    assert.ok(page.html.includes(heading));
    assert.match(page.html, /synthetic-910/);
    assert.match(page.html, /synthetic-911/);
    assert.equal(page.latest.props.products.length, 4);
  });
}

test("cards retain identity, decimal pricing, media, PDP navigation and legacy empty attributes", async () => {
  const h = harness("en");
  const payload = response();
  payload.data.new_arrivals[0].variants.push({ ...payload.data.new_arrivals[0].variants[0], id: 2000, effective_price: "50.00", effective_price_incl_vat: "57.50", discounted_price: "40.00", discounted_price_incl_vat: "46.00" });
  h.setResponse(payload);
  const home = await h.read();
  assert.equal(home.newArrivals[0].price, 46);
  assert.equal(home.newArrivals[0].originalPrice, 57.5);
  assert.equal(home.newArrivals[0].imageUrl, "https://example.invalid/904.jpg");
  assert.equal(home.newArrivals[2].quickAdd.variantId, "1007");
  const html = h.latest(home);
  assert.match(html, /href="\/en\/products\/synthetic-904"/);
  assert.match(html, /src="https:\/\/example.invalid\/904.jpg"/);
  assert.match(html, /46\.00/);
  assert.match(html, /57\.50/);
  assert.equal(home.newArrivals.length, 4);
});

for (const kind of ["empty", "missing", "malformed"]) {
  test(`${kind} arrivals omit the shelf without suppressing Best Sellers or Featured`, async () => {
    const h = harness();
    const payload = response();
    if (kind === "missing") delete payload.data.new_arrivals;
    else payload.data.new_arrivals = kind === "empty" ? [] : {};
    h.setResponse(payload);
    const home = await h.read();
    assert.equal(home.newArrivals.length, 0);
    assert.equal(h.latest(home), "");
    const { html } = await h.page();
    assert.match(html, /synthetic-910/);
    assert.match(html, /synthetic-911/);
    if (kind === "malformed") assert.ok(h.diagnostics.length > 0);
  });
}

test("malformed rows and unrelated sections do not suppress valid arrivals", async () => {
  const h = harness();
  const payload = response();
  payload.data.new_arrivals.splice(1, 0, { id: "invalid" });
  payload.data.best_sellers.push({ id: "invalid" });
  payload.data.featured = {};
  payload.data.banners = [{ id: "invalid" }];
  payload.data.categories = {};
  payload.data.testimonials = [{ rating: "invalid" }];
  payload.data.why_rafal = null;
  h.setResponse(payload);
  const home = await h.read();
  assert.deepEqual(Array.from(home.newArrivals, (p) => p.id), ["904", "902", "907", "901"]);
  assert.deepEqual(Array.from(home.bestSellers, (p) => p.id), ["910"]);
  assert.match(h.latest(home), /synthetic-907/);
  assert.ok(h.diagnostics.length >= 6);
});

test("ineligible products are omitted independently without sorting or badge-based selection", async () => {
  const h = harness();
  const payload = response();
  payload.data.new_arrivals.splice(1, 0, { ...product(920), category: null }, { ...product(921), variants: [] });
  h.setResponse(payload);
  assert.deepEqual(Array.from((await h.read()).newArrivals, (p) => p.id), ["904", "902", "907", "901"]);
});

test("location refresh reads the new city projection and resets the category filter boundary", async () => {
  const h = harness();
  h.setResponse(response(), 801);
  const before = await h.page();
  const payload = response(702);
  payload.data.location.city.id = 803;
  payload.data.new_arrivals[0].variants[0].warehouse_stocks[0].quantity = 0;
  payload.data.new_arrivals[1].variants[0].warehouse_stocks = [];
  payload.data.new_arrivals[2].variants.push({ ...payload.data.new_arrivals[2].variants[0], id: 2010, warehouse_stocks: [{ warehouse_id: 702, quantity: 0 }] });
  h.setResponse(payload, 803);
  const after = await h.page();
  assert.notEqual(before.latest.key, after.latest.key);
  assert.deepEqual(h.calls.map((call) => call.query.city_id), [801, 803]);
  assert.ok(h.calls.every((call) => call.path === "/home"));
  assert.equal(after.latest.props.products[0].inStock, false);
  assert.equal(after.latest.props.products[1].inStock, false);
  assert.equal(after.latest.props.products[2].inStock, true);
  assert.match(after.html, /disabled="" data-quick-add="904"/);
  assert.doesNotMatch(before.html, /disabled="" data-quick-add="904"/);
});

test("invalid envelopes and location contracts still fail closed", async () => {
  const h = harness();
  for (const payload of [{}, { ...response(), success: false }, { ...response(), data: { ...response().data, location: null } }]) {
    h.setResponse(payload);
    await assert.rejects(h.read, { name: "HomeContractError" });
  }
});
