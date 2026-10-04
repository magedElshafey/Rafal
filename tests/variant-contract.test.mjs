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
  vm.runInNewContext(outputText, {
    console,
    module: loaded,
    exports: loaded.exports,
    process,
    require: (specifier) =>
      specifier.startsWith("@/")
        ? loadSource(`src/${specifier.slice(2)}`)
        : require(specifier),
  }, { filename });
  return loaded.exports;
}

const {
  parseVariantAttributes,
  resolveVariantColorSwatch,
  VariantAttributesContractError,
} = loadSource("src/lib/variant-attributes");
const {
  getSelectedOptionsFromVariant,
  isProductOptionValueAvailable,
  resolveProductVariant,
} = loadSource("src/features/products/utils/product-variant-resolver");
const { parseProductDto } = loadSource("src/features/products/api/parse-product-dto");
const { VariantAttributeValue } = loadSource("src/components/ui/variant-attribute-value");
const variantAttributeObjectPrototype = Object.getPrototypeOf(
  parseVariantAttributes(undefined),
);

function realmRecord(entries) {
  return Object.assign(Object.create(variantAttributeObjectPrototype), entries);
}

function variant(id, attributes) {
  return { id, attributes };
}

test("Variant attribute parser preserves exact and Unicode keys", () => {
  const parsed = parseVariantAttributes(realmRecord({ color: "#1d5259", "نوع الحجر": "عقيق", stone_type: "Ruby" }));
  assert.deepEqual(
    Array.from(Object.entries(parsed)),
    [["color", "#1d5259"], ["نوع الحجر", "عقيق"], ["stone_type", "Ruby"]],
  );
  assert.ok(Object.isFrozen(parsed));
});

test("Variant attribute parser accepts null and the confirmed empty-array legacy shape", () => {
  for (const value of [null, undefined, []]) {
    assert.deepEqual(Array.from(Object.entries(parseVariantAttributes(value))), []);
  }
});

test("Variant attribute parser rejects dangerous keys and non-flat string values", () => {
  for (const dangerous of ["__proto__", "prototype", "constructor"]) {
    const input = realmRecord({});
    Object.defineProperty(input, dangerous, {
      configurable: true,
      enumerable: true,
      value: "value",
    });
    assert.throws(
      () => parseVariantAttributes(input),
      VariantAttributesContractError,
    );
  }
  for (const input of [
    realmRecord({ " ": "value" }),
    realmRecord({ size: 1 }),
    realmRecord({ size: true }),
    realmRecord({ size: null }),
    realmRecord({ size: { nested: "value" } }),
    ["value"],
  ]) {
    assert.throws(
      () => parseVariantAttributes(input),
      VariantAttributesContractError,
    );
  }
});

test("Product parsing isolates a malformed Variant from its valid sibling", () => {
  const product = parseProductDto({
    id: 1,
    sku: "PRODUCT",
    name: "Product",
    description: null,
    slug: "product",
    base_price: "100",
    discount_percentage: null,
    discount_end_at: null,
    badges: [],
    is_personalizable: false,
    is_wishlist: false,
    personalization_max_length: null,
    personalization_fee: null,
    viewers_now: 0,
    times_ordered: 0,
    rating_average: 0,
    reviews_count: 0,
    images: [],
    category: null,
    variants: [
      {
        id: 10,
        sku: "VALID",
        attributes: realmRecord({ color: "#1D5259" }),
        effective_price: "100",
        effective_price_incl_vat: null,
        discounted_price: null,
        discounted_price_incl_vat: null,
        images: [],
        warehouse_stocks: [],
      },
      {
        id: 11,
        sku: "INVALID",
        attributes: realmRecord({ size: 1 }),
        effective_price: "100",
        effective_price_incl_vat: null,
        discounted_price: null,
        discounted_price_incl_vat: null,
        images: [],
        warehouse_stocks: [],
      },
    ],
  });
  assert.deepEqual(Array.from(product.variants, ({ id }) => id), [10]);
});

test("Variant selection handles one dimension, two dimensions, partial and impossible choices", () => {
  const variants = [
    variant("red-s", { color: "red", size: "S" }),
    variant("red-m", { color: "red", size: "M" }),
    variant("blue-s", { color: "blue", size: "S" }),
  ];
  assert.equal(resolveProductVariant(variants, { color: "red", size: "M" })?.id, "red-m");
  assert.equal(resolveProductVariant(variants, { color: "red" }), null);
  assert.equal(resolveProductVariant(variants, { color: "blue", size: "M" }), null);
  assert.equal(isProductOptionValueAvailable(variants, { color: "red", size: "M" }, "color", "blue"), false);
  assert.equal(isProductOptionValueAvailable(variants, { color: "red" }, "size", "S"), true);
  assert.deepEqual(
    { ...getSelectedOptionsFromVariant(variants[0]) },
    { color: "red", size: "S" },
  );
});

test("Duplicate and empty combinations resolve only when commerce identity is unique", () => {
  const duplicate = [
    variant("10", { color: "#FF0000", size: "M" }),
    variant("11", { size: "M", color: "#FF0000" }),
  ];
  assert.equal(resolveProductVariant(duplicate, { color: "#FF0000", size: "M" }), null);
  assert.equal(isProductOptionValueAvailable(duplicate, { size: "M" }, "color", "#FF0000"), true);
  assert.equal(resolveProductVariant([variant("default", {})], {})?.id, "default");
  assert.equal(resolveProductVariant([variant("a", {}), variant("b", {})], {}), null);
  assert.equal(resolveProductVariant([], {}), null);
});

test("Color presentation normalizes canonical HEX without mutating identity and maps observed legacy colors", () => {
  const rawColor = "#1d5259";
  assert.deepEqual({ ...resolveVariantColorSwatch(rawColor) }, { kind: "canonical", cssColor: "#1D5259" });
  assert.equal(rawColor, "#1d5259");
  const expected = {
    red: "#FF0000",
    blue: "#0000FF",
    pink: "#FFC0CB",
    silver: "#C0C0C0",
    gold: "#FFD700",
    black: "#000000",
  };
  for (const [value, cssColor] of Object.entries(expected)) {
    assert.deepEqual({ ...resolveVariantColorSwatch(value) }, { kind: "legacy", cssColor });
  }
});

test("Unknown color uses a neutral safe fallback and never becomes arbitrary CSS", () => {
  assert.deepEqual(
    { ...resolveVariantColorSwatch("url(javascript:bad)") },
    { kind: "fallback", cssColor: "#D4D4D4" },
  );
});

test("Shared attribute presentation hides color text and preserves non-color text", () => {
  for (const value of ["#1D5259", "red", "gold", "unknown-backend-color"]) {
    const html = renderToStaticMarkup(
      React.createElement(VariantAttributeValue, {
        attributeKey: "color",
        attributeValue: value,
      }),
    );
    assert.equal(html.replace(/<[^>]+>/g, ""), "");
    assert.ok(!html.includes("title="));
    assert.ok(!html.includes("aria-label="));
  }
  const text = renderToStaticMarkup(
    React.createElement(VariantAttributeValue, {
      attributeKey: "size",
      attributeValue: "M",
    }),
  );
  assert.equal(text.replace(/<[^>]+>/g, ""), "M");
});

test("Cart, Checkout and Orders use the shared attribute presentation", () => {
  for (const file of [
    "src/features/cart/components/cart-page.tsx",
    "src/features/checkout/components/checkout-summary.tsx",
    "src/features/orders/components/order-items.tsx",
  ]) {
    const source = readFileSync(path.join(root, file), "utf8");
    assert.match(source, /<VariantAttributeValue\b/);
  }
});
