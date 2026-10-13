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
let hooks = null;
let addedLine = null;
let cartLines = [];
// Keep the real purchase panel/options; omit unrelated visual children.
const visualStub = new Proxy({}, { get: () => () => null });
function loadSource(relativePath) {
  const base = path.join(root, relativePath);
  const filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
  assert.ok(filename, relativePath);
  if (modules.has(filename)) return modules.get(filename).exports;
  const loaded = { exports: {} };
  modules.set(filename, loaded);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  vm.runInNewContext(outputText, {
    console, process, module: loaded, exports: loaded.exports,
    require: (specifier) => {
      if (specifier === "server-only") return {};
      // Test-only hook dispatcher: panel markup uses React, experience callbacks
      // use a deterministic state harness without a browser or new dependency.
      /* eslint-disable react-hooks/rules-of-hooks, react-hooks/exhaustive-deps */
      if (specifier === "react") return {
        ...React,
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
      if (specifier === "@tanstack/react-query") return {
        useQueryClient: () => ({}),
        useMutation: () => ({ mutate: (input) => { addedLine = input; }, reset: () => {} }),
      };
      if (specifier === "@/features/cart/hooks/use-current-cart") return { useCurrentCart: () => ({ data: { lines: cartLines } }) };
      if (specifier === "@/features/location/components/browsing-city-provider") return { useBrowsingCity: () => ({ isChanging: false }) };
      if (specifier === "@/i18n/navigation") return { useRouter: () => ({}) };
      if (specifier.startsWith("@/features/cart/")) return {};
      if (specifier.startsWith("@/components/") ||
          specifier.startsWith("@/features/products/components/")) return visualStub;
      return specifier.startsWith("@/")
        ? loadSource(`src/${specifier.slice(2)}`) : require(specifier);
    },
  }, { filename });
  return loaded.exports;
}

const { mapProductDtoToProductDetails } = loadSource("src/features/products/api/product-mappers");
const { parseProductDto } = loadSource("src/features/products/api/parse-product-dto");
const { getResolvedVariantAvailability } = loadSource("src/features/products/server/product-availability-boundary");
const { resolveProductVariant } = loadSource("src/features/products/utils/product-variant-resolver");
const { ProductPurchasePanel } = loadSource("src/features/products/components/product-details/product-purchase-panel");
const { ProductPurchaseExperience } = loadSource("src/features/products/components/product-details/product-purchase-experience");

function productDtoWithKeys(firstKey = "length") {
  return {
    id: 17, slug: "product", name: "Product", description: null,
    sku: "PRODUCT", base_price: "100.00", badges: [], is_wishlist: false,
    personalization_max_length: null, personalization_fee: null,
    viewers_now: 0, times_ordered: 0, rating_average: 0, reviews_count: 0,
    category: { id: 5, name: "Gifts", slug: "gifts" }, images: [],
    is_personalizable: false, discount_percentage: 30, discount_end_at: null,
    variants: [
      { id: 49, attributes: { [firstKey]: "60 cm" }, discounted_price_incl_vat: "96.60" },
      { id: 50, attributes: { length: "40cm" }, discounted_price_incl_vat: "104.65" },
    ].map((variant) => ({
      ...variant, sku: `sku-${variant.id}`, effective_price: "120.00",
      effective_price_incl_vat: "138.00", discounted_price: "84.00",
      images: [`https://example.com/${variant.id}.jpg`],
      warehouse_stocks: [{ warehouse_id: 6, quantity: 100 }],
    })),
  };
}

function productWithKeys(firstKey = "length", maxCartItemQuantity = 20) {
  return mapProductDtoToProductDetails({
    ...productDtoWithKeys(firstKey), max_cart_item_quantity: maxCartItemQuantity,
  });
}

async function renderOptions(product, warehouseId = 6, selectedVariantId = product.variants[0].id) {
  const availabilityByVariantId = await getResolvedVariantAvailability({
    variants: product.variants, warehouseId, maxOrderQuantity: product.maxCartItemQuantity,
  });
  const markup = renderToStaticMarkup(React.createElement(ProductPurchasePanel, {
    product, availabilityByVariantId, availability: availabilityByVariantId["49"],
    selectedVariantId, variant: null,
    locale: "en", remainingAddable: null, quantity: 1,
    copy: {
      availability: { availableTemplate: "Available {max}", outOfStock: "Unavailable" },
      options: { labels: {} },
      socialProof: { timesOrdered: "Ordered", viewersNow: "Viewing" },
      quantity: { labelTemplate: "{value}" },
    },
  }));
  const inputs = [...markup.matchAll(/<button\b[^>]*aria-pressed[^>]*>/g)].map(([input]) => input);
  return { availabilityByVariantId, inputs, markup };
}

test("PDP enables stocked options and preserves selected variant price, media and identity", async () => {
  const product = productWithKeys();
  const { inputs, availabilityByVariantId } = await renderOptions(product);
  assert.equal(inputs.length, 2);
  assert.ok(inputs.every((input) => !input.includes("disabled")));
  const selected = resolveProductVariant(product.variants, { length: "40cm" });
  assert.equal(selected.id, "50");
  assert.equal(selected.pricing.current.amount, 104.65);
  assert.equal(selected.imageIds[0], "url:https://example.com/50.jpg");
  assert.equal(availabilityByVariantId[selected.id].maxOrderQuantity, 20);
});

test("PDP disables zero stock and missing warehouse stock and updates on warehouse switching", async () => {
  const product = productWithKeys("lenth");
  product.variants[0].warehouseStocks.push({ warehouseId: 7, quantity: 0 });
  product.variants[1].warehouseStocks.push({ warehouseId: 7, quantity: 3 });
  for (const [warehouseId, disabled] of [[6, [false, false]], [7, [true, false]], [8, [true, true]], [6, [false, false]]]) {
    const { inputs, availabilityByVariantId } = await renderOptions(product, warehouseId);
    assert.deepEqual(inputs.map((input) => input.includes("disabled")), disabled);
    if (warehouseId === 7) assert.equal(availabilityByVariantId["50"].maxOrderQuantity, 3);
  }
});

test("supplied inconsistent keys allow selecting both stocked variants by their IDs", async () => {
  const product = productWithKeys("lenth");
  assert.deepEqual(Array.from(product.options, (option) => option.key), ["lenth", "length"]);
  const { inputs, availabilityByVariantId } = await renderOptions(product);
  assert.equal(availabilityByVariantId["50"].status, "available");
  assert.match(inputs[0], /value="49"/);
  assert.match(inputs[1], /value="50"/);
  assert.ok(!inputs[1].includes("disabled"));
});

test("duplicate, empty and disjoint multi-attribute maps retain distinct selectable variant IDs", async () => {
  for (const attributes of [
    [{}, {}],
    [{ size: "M" }, { size: "M" }],
    [{ material: "glass", height: "60" }, { finish: "matte", width: "40" }],
  ]) {
    const product = productWithKeys();
    product.variants.forEach((variant, index) => { variant.attributes = attributes[index]; });
    const { inputs } = await renderOptions(product);
    assert.equal(inputs.length, attributes.reduce((count, attrs) => count + Math.max(1, Object.keys(attrs).length), 0));
    assert.ok(inputs.every((input) => !input.includes("disabled")));
  }
});

function createExperienceRenderer(product, availabilityByVariantId) {
  const state = [];
  return (nextProduct = product, nextAvailability = availabilityByVariantId) => {
    hooks = { index: 0, state };
    try {
      const tree = ProductPurchaseExperience({
        product: nextProduct, availabilityByVariantId: nextAvailability, locale: "en",
        copy: { panel: {}, purchase: { errors: {}, sticky: {} }, gallery: {} },
      });
      const elements = [];
      const visit = (element) => {
        if (!React.isValidElement(element)) return;
        elements.push(element);
        React.Children.forEach(element.props.children, visit);
      };
      visit(tree);
      return {
        panel: elements.find((element) => element.props.onSelectVariant)?.props,
        gallery: elements.find((element) => element.props.onSelectImage)?.props,
      };
    } finally { hooks = null; }
  };
}

test("PDP selection changes exact price, gallery, quantity cap and Add-to-Cart variant ID", async () => {
  const product = productWithKeys("lenth");
  product.variants[1].warehouseStocks[0].quantity = 3;
  const availabilityByVariantId = await getResolvedVariantAvailability({
    variants: product.variants, warehouseId: 6, maxOrderQuantity: product.maxCartItemQuantity,
  });
  const render = createExperienceRenderer(product, availabilityByVariantId);
  for (let count = 0; count < 5; count++) render().panel.onIncreaseQuantity();
  render().panel.onSelectVariant("50");
  const { panel, gallery } = render();
  assert.equal(panel.variant.id, "50");
  assert.equal(panel.variant.pricing.current.amount, 104.65);
  assert.equal(gallery.selectedImageId, "url:https://example.com/50.jpg");
  assert.equal(panel.quantity, 3);
  assert.equal(panel.canAddToCart, true);
  panel.onAddToCart({ currentTarget: {} });
  assert.equal(addedLine.variantId, "50");
  assert.equal(addedLine.quantity, 3);
  availabilityByVariantId["49"] = { status: "out_of_stock" };
  render().panel.onSelectVariant("49");
  assert.equal(render().panel.variant.id, "50");
});

test("exact case-sensitive keys create separate labeled groups and identical keys share one", async () => {
  const product = productWithKeys("lenth");
  product.variants.push({ ...product.variants[1], id: "51", attributes: { length: "20cm", Length: "upper" } });
  const { markup } = await renderOptions(product);
  const groups = [...markup.matchAll(/<fieldset[^>]*><legend[^>]*>(.*?)<\/legend>(.*?)<\/fieldset>/g)];
  assert.deepEqual(groups.map(([, label]) => label), ["Lenth", "Length", "Length"]);
  assert.match(groups[0][2], /60 cm/);
  assert.doesNotMatch(groups[0][2], /40cm/);
  assert.match(groups[1][2], /40cm/);
  assert.match(groups[1][2], /20cm/);
  assert.doesNotMatch(groups[1][2], /upper/);
  assert.match(groups[2][2], /upper/);
});

test("selection across groups deselects the previous variant globally", async () => {
  const product = productWithKeys("lenth");
  const { availabilityByVariantId } = await renderOptions(product);
  const render = createExperienceRenderer(product, availabilityByVariantId);
  render().panel.onSelectVariant("50");
  const { inputs } = await renderOptions(product, 6, render().panel.selectedVariantId);
  assert.match(inputs[0], /aria-pressed="false"/);
  assert.match(inputs[1], /aria-pressed="true"/);
  render().panel.onSelectVariant("49");
  assert.equal(render().panel.selectedVariantId, "49");
});

test("Product limit parsing accepts null, missing, valid and zero; rejects malformed values", () => {
  const payload = { ...productDtoWithKeys(), variants: [] };
  for (const limit of [undefined, null, 0, 5, 150]) {
    const dto = parseProductDto({ ...payload, ...(limit === undefined ? {} : { max_cart_item_quantity: limit }) });
    assert.equal(dto.max_cart_item_quantity, limit);
    assert.equal(mapProductDtoToProductDetails(dto).maxCartItemQuantity, limit ?? undefined);
  }
  for (const limit of [-1, 1.5, "5", "", false, {}, [], NaN, Infinity]) {
    assert.throws(() => parseProductDto({ ...payload, max_cart_item_quantity: limit }), /max_cart_item_quantity/);
  }
});

test("effective limits use product limits or warehouse stock, preserve zero and update per warehouse", async () => {
  for (const [limit, expected] of [[undefined, 100], [null, 100], [7, 7], [150, 100], [0, 0]]) {
    const payload = productDtoWithKeys();
    // Empty attributes are valid across the parser's isolated test realm.
    payload.variants = payload.variants.map((variant) => ({ ...variant, attributes: null }));
    if (limit !== undefined) payload.max_cart_item_quantity = limit;
    const product = mapProductDtoToProductDetails(parseProductDto(payload));
    product.variants[0].warehouseStocks.push({ warehouseId: 7, quantity: 3 });
    const { availabilityByVariantId, markup } = await renderOptions(product);
    assert.equal(availabilityByVariantId["49"].maxOrderQuantity, expected);
    assert.match(markup, new RegExp(`Available ${expected}`));
    const other = await renderOptions(product, 7);
    assert.equal(other.availabilityByVariantId["49"].maxOrderQuantity, Math.min(expected, 3));
    assert.equal(other.availabilityByVariantId["50"].status, "out_of_stock");
    const missingWarehouse = await renderOptions(product, 8);
    assert.equal(missingWarehouse.availabilityByVariantId["49"].status, "out_of_stock");
    const render = createExperienceRenderer(product, availabilityByVariantId);
    assert.equal(render().panel.canAddToCart, expected > 0);
    addedLine = null;
    render().panel.onAddToCart({ currentTarget: {} });
    assert.equal(addedLine !== null, expected > 0);
  }
});

test("cart-held quantity across lines caps selector and Add; exhausted and zero limits block mutation", async () => {
  try {
    for (const [limit, held, remaining] of [[5, 2, 3], [5, 5, 0], [5, 6, 0], [0, 0, 0], [undefined, 98, 2]]) {
      const product = productWithKeys();
      product.maxCartItemQuantity = limit;
      cartLines = [
        { variant: { id: "49" }, quantity: Math.floor(held / 2) },
        { variant: { id: "49" }, quantity: Math.ceil(held / 2) },
        { variant: { id: "50" }, quantity: 100 },
      ];
      const { availabilityByVariantId } = await renderOptions(product);
      const render = createExperienceRenderer(product, availabilityByVariantId);
      for (let count = 0; count < 6; count++) render().panel.onIncreaseQuantity();
      const { panel } = render();
      assert.equal(panel.quantity, remaining);
      assert.equal(panel.remainingAddable, remaining);
      assert.equal(panel.canAddToCart, remaining > 0);
      addedLine = null;
      panel.onAddToCart({ currentTarget: {} });
      assert.equal(addedLine?.quantity ?? 0, remaining);
    }
  } finally { cartLines = []; }
});

test("existing selection clamps immediately when warehouse stock or product limit changes", async () => {
  const product = productWithKeys();
  product.variants[0].warehouseStocks.push({ warehouseId: 7, quantity: 2 });
  const { availabilityByVariantId } = await renderOptions(product);
  const render = createExperienceRenderer(product, availabilityByVariantId);
  for (let count = 0; count < 8; count++) render().panel.onIncreaseQuantity();
  const other = await renderOptions(product, 7);
  assert.equal(render(product, other.availabilityByVariantId).panel.quantity, 2);
  const updatedProduct = { ...product, maxCartItemQuantity: 1 };
  const updated = await renderOptions(updatedProduct);
  assert.equal(render(updatedProduct, updated.availabilityByVariantId).panel.quantity, 1);
  const zero = await renderOptions({ ...product, maxCartItemQuantity: 0 });
  assert.equal(render(product, zero.availabilityByVariantId).panel.canAddToCart, false);
});

test("PDP reads Product Details limit and has no Settings dependency", () => {
  const page = readFileSync(path.join(root, "src/app/[locale]/(storefront)/products/[slug]/page.tsx"), "utf8");
  assert.match(page, /maxOrderQuantity: product\.maxCartItemQuantity/);
  assert.doesNotMatch(page, /getPublicSettings|publicSettings/);
});
