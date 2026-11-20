import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file) {
  const source = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })(name => {
    if (name === "@/features/products/utils/localize-product-badge") return load("src/features/products/utils/localize-product-badge.ts");
    if (name === "@/lib/utils") return { cn: (...values) => values.filter(Boolean).join(" ") };
    if (name === "@/components/ui/icon-button") return { IconButton: ({ children, variant: _variant, size: _size, ...props }) => {
      void _variant; void _size;
      return React.createElement("button", props, children);
    } };
    if (name.startsWith("@/")) return new Proxy({}, { get: () => () => null });
    return require(name);
  }, loaded, loaded.exports);
  return loaded.exports;
}
const common = locale => JSON.parse(readFileSync(`src/messages/${locale}/common.json`, "utf8"));
const homeCard = load("src/features/home/components/home-product-card.tsx").HomeProductCard;
const listingCard = load("src/features/products/components/listing/product-grid.tsx").ListingProductCard;

test("Home and listing/Cart recommendation cards localize only known badges across locale changes", () => {
  for (const locale of ["en", "ar", "en"]) {
    const labels = common(locale).productListing.badges;
    const homeLabels = JSON.parse(readFileSync(`src/messages/${locale}/home.json`, "utf8")).productSections.badges;
    for (const [raw, key] of [["جديد", "new"], ["خصم", "discount"], ["بالاسم", "personalization"], ["Unknown badge", null]]) {
      const product = { id: "1", name: "Product", slug: "product", badges: [raw], price: 100, ratingAverage: 4, reviewsCount: 2, inStock: true };
      const base = { product, locale, ratingLabel: value => value, reviewsLabel: String };
      assert.equal(listingCard({ ...base, badgeLabels: labels }).props.badge.label, key ? labels[key] : raw);
      assert.equal(homeCard({ ...base, labels: { ...homeLabels, rating: String, reviews: String } }).props.badge.label, key ? homeLabels[key] : raw);
    }
    const fallback = listingCard({ locale, product: { name: "Product", price: 100, ratingAverage: 4, badge: "discount" }, badgeLabels: labels, ratingLabel: String, reviewsLabel: String });
    assert.equal(fallback.props.badge.label, labels.discount);
  }
});

test("announcement message and dismiss accessible label render in both locales", () => {
  const Banner = load("src/components/shell/storefront/announcment-banner/AnnouncmentBanner.tsx").default;
  for (const locale of ["en", "ar"]) {
    const copy = common(locale).headerUtility.announcement;
    const html = renderToStaticMarkup(React.createElement(Banner, { message: copy.message, dismissLabel: copy.dismiss, dismissible: true }));
    assert.ok(html.includes(copy.message));
    assert.ok(html.includes(`aria-label="${copy.dismiss}"`));
    if (locale === "en") assert.doesNotMatch(html, /[\u0600-\u06ff]/u);
  }
  const layout = readFileSync("src/app/[locale]/(storefront)/layout.tsx", "utf8");
  assert.match(layout, /message=\{t\("announcement.message"\)\}/);
  assert.match(layout, /dismissLabel=\{t\("announcement.dismiss"\)\}/);
});
