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
let selection;
let selected = {};
let stateIndex = 0;
let submitted = [];
const noop = () => {};
function loadSource(relativePath) {
  const base = path.join(root, relativePath);
  const filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
  assert.ok(filename, relativePath);
  if (modules.has(filename)) return modules.get(filename).exports;
  const loaded = { exports: {} };
  modules.set(filename, loaded);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  vm.runInNewContext(outputText, {
    console, process, module: loaded, exports: loaded.exports,
    require: (specifier) => {
      if (specifier === "react") return {
        ...React, useEffect: fn => fn(), useId: () => "options", useRef: (value) => ({ current: value }),
        useState: () => [stateIndex++ === 0 ? selected : 1, noop],
      };
      if (specifier === "next-intl") return { useTranslations: () => (key) => key };
      if (specifier === "@tanstack/react-query") return {
        useQueryClient: () => ({ isMutating: () => 0, getQueryState: () => ({ data: { lines: [] }, status: "success", fetchStatus: "idle" }) }),
        useQuery: ({ kind }) => kind === "selection"
          ? { data: { kind: "selection", data: selection }, isFetching: false }
          : { data: { lines: [] } },
        useMutation: () => ({ mutate: (input) => submitted.push(input), reset: noop }),
      };
      if (specifier === "@/features/products/api/quick-add-selection.client") return { quickAddSelectionQueryOptions: () => ({ kind: "selection" }) };
      if (specifier === "@/features/cart/api/cart-query") return { currentCartQueryKey: () => ["cart", "current"], currentCartQueryOptions: () => ({ kind: "cart" }) };
      if (specifier === "@/features/cart/actions/add-cart-line") return {};
      if (specifier === "@/features/cart/api/cart-recommendation-lifecycle") return {};
      if (specifier === "@/features/location/components/browsing-city-provider") return { useBrowsingCity: () => ({ committedCity: { id: 27 }, isChanging: false }) };
      if (specifier === "@/components/ui/rafal-modal") return { RafalModal: ({ children }) => React.createElement("div", null, children) };
      if (specifier === "@/components/ui/button") return { Button: (props) => React.createElement("button", {
        disabled: props.disabled, onClick: props.onClick,
        "data-quick-add-action": props["data-quick-add-action"],
      }, props.children) };
      if (specifier === "@/components/ui/icons") return { CheckIcon: () => null };
      if (specifier === "@/i18n/navigation") return { Link: ({ children, ...props }) => React.createElement("a", props, children) };
      if (specifier === "@/lib/rafal-toast") return { useRafalToast: () => ({ success() {}, error() {} }) };
      if (specifier.startsWith("@/")) return loadSource(`src/${specifier.slice(2)}`);
      return require(specifier);
    },
  }, { filename });
  return loaded.exports;
}

const { mapProductDtoToProductDetails } = loadSource("src/features/products/api/product-mappers");
const { projectQuickAddSelectionData } = loadSource("src/features/products/utils/quick-add-selection");
const { resolveProductVariant, isProductOptionValueAvailable } = loadSource("src/features/products/utils/product-variant-resolver");
const { ProductQuickAddSheet } = loadSource("src/features/products/components/product-card/product-quick-add-sheet");

function setup(attributes, selectedOptions = {}) {
  const product = mapProductDtoToProductDetails({
    id: 9, name: "Product", slug: "product", images: [], is_personalizable: false,
    variants: attributes.map((attributes, index) => ({
      id: index + 101, sku: `SECRET-SKU-${index}`, attributes, images: [],
      warehouse_stocks: [], effective_price: "100", effective_price_incl_vat: null,
      discounted_price: null, discounted_price_incl_vat: null,
    })),
  });
  selection = projectQuickAddSelectionData(product, { id: 27, name: "City" },
    Object.fromEntries(product.variants.map(({ id }) => [id, { status: "available", maxOrderQuantity: 5 }])));
  selected = selectedOptions;
  submitted = [];
  return product;
}
function render() {
  stateIndex = 0;
  const tree = ProductQuickAddSheet({ cityId: 27, locale: "en", onOpenChange: noop, productName: "Product", returnFocusRef: { current: null }, slug: "product" });
  const html = renderToStaticMarkup(tree);
  const labels = [...html.matchAll(/<label\b[^>]*>(.*?)<\/label>/gs)].map((match) => match[1].replace(/<[^>]*>/g, ""));
  function findAdd(node) {
    if (!node || typeof node !== "object") return null;
    if (node.props?.["data-quick-add-action"] === "add") return node;
    return React.Children.toArray(node.props?.children).map(findAdd).find(Boolean);
  }
  return { html, labels, add: findAdd(tree) };
}

test("repeated values render once in first-seen order without deleting Variant records", () => {
  const product = setup(["30", "30", "100", "100", "50", "50"].map((size) => ({ size })));
  assert.deepEqual(render().labels, ["30", "100", "50"]);
  assert.equal(product.variants.length, 6);
  assert.equal(selection.product.variants.length, 6);
  assert.equal(new Set(selection.product.variants.map(({ id }) => id)).size, 6);
});

test("shared multi-attribute values render once, with color swatches retained", () => {
  setup([{ size: "M", color: "red" }, { size: "M", color: "blue" }]);
  const { labels, html } = render();
  assert.deepEqual(labels, ["M", "red", "blue"]);
  assert.match(html, /background-color:#FF0000/);
  assert.match(html, /background-color:#0000FF/);
  assert.doesNotMatch(html, /SECRET-SKU/);
});

test("exact key, value, case, and whitespace identity remain distinct", () => {
  setup([{ size: "30" }, { size: "030" }, { size: " 30 " }, { Size: "30" }, { color: "Red" }, { color: "red" }]);
  assert.deepEqual(Array.from(selection.product.options, ({ key }) => key), ["size", "Size", "color"]);
  assert.deepEqual(render().labels, ["30", "030", " 30 ", "30", "Red", "red"]);
});

test("duplicate full combinations remain ambiguous and cannot submit a Variant ID", () => {
  setup([{ size: "30" }, { size: "30" }], { size: "30" });
  assert.equal(resolveProductVariant(selection.product.variants, selected), null);
  const { labels, add } = render();
  assert.deepEqual(labels, ["30"]);
  assert.equal(add.props.disabled, true);
  add.props.onClick();
  assert.deepEqual(submitted, []);
});

test("complete unique selection submits only the resolved variant.id", () => {
  setup([{ size: "M", color: "red" }, { size: "M", color: "blue" }], { size: "M", color: "blue" });
  assert.equal(resolveProductVariant(selection.product.variants, selected)?.id, "102");
  const { add } = render();
  assert.equal(add.props.disabled, false);
  add.props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(submitted)), [{ productId: "9", quantity: 1, variantId: "102" }]);
});

test("partial selection compatibility and unavailable purchase guards remain intact", () => {
  setup([{ size: "M", color: "red" }, { size: "M", color: "blue" }, { size: "S", color: "red" }], { color: "blue" });
  assert.equal(isProductOptionValueAvailable(selection.product.variants, selected, "size", "M"), true);
  assert.equal(isProductOptionValueAvailable(selection.product.variants, selected, "size", "S"), false);
  let view = render();
  assert.match(view.html, /disabled=""[^>]*value="S"/);
  assert.equal(view.add.props.disabled, true);
  view.add.props.onClick();
  assert.deepEqual(submitted, []);
  selected = { size: "M", color: "blue" };
  for (const status of ["out_of_stock", "purchase_unavailable"]) {
    selection.product.variants[1].availability = { status };
    view = render();
    assert.equal(view.add.props.disabled, true);
    view.add.props.onClick();
    assert.deepEqual(submitted, []);
  }
});

test("normal distinct products keep their option order and purchase selection", () => {
  setup([{ material: "Gold", width: "2" }, { material: "Silver", width: "4" }], { material: "Gold", width: "2" });
  assert.deepEqual(render().labels, ["Gold", "Silver", "2", "4"]);
  assert.equal(render().add.props.disabled, false);
  assert.equal(resolveProductVariant(selection.product.variants, selected)?.id, "101");
});
