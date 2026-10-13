import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import React from "react";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const panelPath = "src/features/products/components/product-details/product-purchase-panel";
const experiencePath = "src/features/products/components/product-details/product-purchase-experience";

// Same Node/TypeScript VM approach as the existing PDP tests. Each test owns
// its module cache, hooks and cart. No environment files or real API modules load.
function createHarness() {
  const modules = new Map();
  const state = [];
  let cursor = 0;
  let cartLines = [];
  const submissions = [];
  const forbidden = () => assert.fail("Live I/O is forbidden in quantity tests");
  const visuals = new Proxy({}, { get: () => () => null });
  const context = vm.createContext({ console, fetch: forbidden });
  const mocks = {
    "server-only": {},
    react: {
      ...React,
      // Effects concern observers/mutation error reset, not quantity calculations.
      useEffect: () => {},
      useRef: (initial) => {
        const slot = cursor++;
        if (!(slot in state)) state[slot] = { current: initial };
        return state[slot];
      },
      useState: (initial) => {
        const slot = cursor++;
        if (!(slot in state)) state[slot] = typeof initial === "function" ? initial() : initial;
        return [state[slot], (next) => {
          state[slot] = typeof next === "function" ? next(state[slot]) : next;
        }];
      },
    },
    "@tanstack/react-query": {
      useQueryClient: () => ({}),
      useMutation: () => ({
        isPending: false,
        isError: false,
        reset: () => {},
        mutate: (input) => submissions.push(input),
      }),
    },
    "@/features/cart/actions/add-cart-line": { addCartLine: forbidden },
    "@/features/cart/api/cart-query": { setCurrentCartQueryData: forbidden },
    "@/features/cart/hooks/use-current-cart": {
      useCurrentCart: () => ({ data: { lines: cartLines } }),
    },
    "@/features/location/components/browsing-city-provider": {
      useBrowsingCity: () => ({ isChanging: false }),
    },
    "@/i18n/navigation": { useRouter: () => ({}) },
  };

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
    const isolatedRequire = (specifier) => {
      if (specifier in mocks) return mocks[specifier];
      if (specifier === "react/jsx-runtime") return require(specifier);
      if (specifier.startsWith("@/components/") || specifier.startsWith("@/features/products/components/")) return visuals;
      if (specifier.startsWith("@/features/products/") ||
          ["@/lib/variant-attributes", "@/lib/api/runtime-validation"].includes(specifier)) {
        return loadSource(`src/${specifier.slice(2)}`);
      }
      if (specifier === "@/lib/utils") return { cn: (...values) => values.filter(Boolean).join(" ") };
      throw new Error(`Unmocked dependency blocked: ${specifier}`);
    };
    vm.runInContext(`(function(require, module, exports) { ${outputText}\n})`, context, { filename })(isolatedRequire, loaded, loaded.exports);
    return loaded.exports;
  }

  const { parseProductDto } = loadSource("src/features/products/api/parse-product-dto");
  const { mapProductDtoToProductDetails } = loadSource("src/features/products/api/product-mappers");
  const { getResolvedVariantAvailability } = loadSource("src/features/products/server/product-availability-boundary");
  const { ProductPurchaseExperience } = loadSource(experiencePath);
  const { ProductPurchasePanel } = loadSource(panelPath);

  return {
    submissions,
    setCart: (lines) => { cartLines = lines; },
    product: (payload) => {
      // JSON transport enters the parser's realm, preserving real plain-object
      // validation instead of relaxing it or omitting variant attributes.
      const dto = parseProductDto(vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(payload))})`, context));
      const product = mapProductDtoToProductDetails(dto);
      assert.equal(dto.max_cart_item_quantity, payload.max_cart_item_quantity);
      assert.equal(product.maxCartItemQuantity, payload.max_cart_item_quantity ?? undefined);
      return product;
    },
    availability: (product, warehouseId = 6) => getResolvedVariantAvailability({
      variants: product.variants, warehouseId, maxOrderQuantity: product.maxCartItemQuantity,
    }),
    render: (product, availabilityByVariantId) => {
      cursor = 0;
      const tree = ProductPurchaseExperience({
        product, availabilityByVariantId, locale: "en",
        copy: { panel: {
          quantity: { title: "Quantity", decrease: "Decrease", increase: "Increase", labelTemplate: "{value}", remainingHintTemplate: "Remaining {max}" },
          price: {}, addToCart: "Add to cart", skuTemplate: "SKU {sku}",
        }, purchase: { errors: {}, sticky: {} }, gallery: {} },
      });
      const nodes = descendants(tree);
      const panel = nodes.find((node) => node.props.onIncreaseQuantity).props;
      const sticky = nodes.find((node) => node.props.onAddToCart && !node.props.onIncreaseQuantity).props;
      // Execute the actual panel; inspect its real native selector and Button
      // props. Unrelated child presentation is intentionally not mounted.
      const controls = descendants(ProductPurchasePanel(panel));
      return {
        panel, sticky,
        increase: controls.find((node) => node.props["aria-label"] === "Increase").props,
        decrease: controls.find((node) => node.props["aria-label"] === "Decrease").props,
        add: controls.find((node) => node.props.children === "Add to cart").props,
        output: controls.find((node) => node.type === "output").props.children,
      };
    },
  };
}

function descendants(tree) {
  const nodes = [];
  function visit(node) {
    if (!React.isValidElement(node)) return;
    nodes.push(node);
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree);
  return nodes;
}

// Entirely invented test-only catalog; no copied catalog records or image URLs.
function fixture(limit, stocks = [[6, 100]]) {
  return {
    id: 9001, slug: "synthetic-quantity-product", name: "Synthetic product",
    description: null, sku: "SYNTHETIC", base_price: "100.00",
    badges: [], is_wishlist: false, is_personalizable: false,
    personalization_max_length: null, personalization_fee: null,
    viewers_now: 0, times_ordered: 0, rating_average: 0, reviews_count: 0,
    category: { id: 9002, name: "Synthetic category", slug: "synthetic-category" },
    images: [], discount_percentage: 0, discount_end_at: null,
    ...(limit === undefined ? {} : { max_cart_item_quantity: limit }),
    variants: [9003, 9004].map((id) => ({
      id, sku: `SYNTHETIC-${id}`, attributes: { size: String(id) },
      effective_price: "100.00", effective_price_incl_vat: "115.00",
      discounted_price: null, discounted_price_incl_vat: null, images: [],
      warehouse_stocks: stocks.map(([warehouse_id, quantity]) => ({ warehouse_id, quantity })),
    })),
  };
}

function assertCap(harness, product, availability, remaining) {
  const render = () => harness.render(product, availability);
  for (let i = 0; i < remaining + 3; i++) {
    const view = render();
    assert.ok(view.panel.quantity <= remaining);
    assert.equal(view.output, view.panel.quantity);
    // Invoke even disabled controls to test handler guards as well as UI props.
    view.increase.onClick();
  }
  const view = render();
  assert.equal(view.panel.remainingAddable, remaining);
  assert.equal(view.output, remaining);
  assert.equal(view.increase.disabled, true);
  assert.equal(view.add.disabled, remaining === 0);
  assert.equal(view.sticky.canAddToCart, remaining > 0);
  const before = harness.submissions.length;
  view.add.onClick({ currentTarget: {} });
  view.sticky.onAddToCart({ currentTarget: {} });
  assert.equal(harness.submissions.length - before, remaining > 0 ? 2 : 0);
  for (const submission of harness.submissions.slice(before)) {
    assert.equal(submission.quantity, remaining);
    assert.equal(submission.variantId, view.panel.selectedVariantId);
    assert.equal(submission.productId, product.id);
  }
  for (let i = 0; i < remaining + 3; i++) render().decrease.onClick();
  assert.equal(render().output, remaining === 0 ? 0 : 1);
  assert.equal(render().decrease.disabled, true);
}

for (const [name, limit, stock, expected] of [
  ["null product limit + stock 100 -> 100", null, 100, 100],
  ["missing product limit + stock 100 -> 100", undefined, 100, 100],
  ["product limit 5 + stock 100 -> 5", 5, 100, 5],
  ["product limit 20 + stock 3 -> 3", 20, 3, 3],
  ["product limit 0 + stock 100 -> purchasing blocked", 0, 100, 0],
]) {
  test(name, async () => {
    const harness = createHarness();
    const product = harness.product(fixture(limit, [[6, stock]]));
    const availability = await harness.availability(product);
    assert.equal(availability["9003"].maxOrderQuantity, expected);
    assertCap(harness, product, availability, expected);
  });
}

for (const [name, stocks] of [
  ["product limit 10 + stock 0 -> out of stock", [[6, 0]]],
  ["missing selected warehouse stock -> unavailable", [[7, 100]]],
  ["empty warehouse stocks -> unavailable", []],
]) {
  test(name, async () => {
    const harness = createHarness();
    const product = harness.product(fixture(10, stocks));
    const availability = await harness.availability(product);
    assert.equal(availability["9003"].status, "out_of_stock");
    const view = harness.render(product, availability);
    assert.equal(view.increase.disabled, true);
    assert.equal(view.decrease.disabled, true);
    assert.equal(view.add.disabled, true);
    assert.equal(view.sticky.canAddToCart, false);
    view.increase.onClick();
    view.add.onClick({ currentTarget: {} });
    view.sticky.onAddToCart({ currentTarget: {} });
    assert.equal(harness.submissions.length, 0);
  });
}

test("cart holds 3 across lines with limit 5 -> only 2 additional units; exhaustion blocks Add", async () => {
  const harness = createHarness();
  const product = harness.product(fixture(5));
  const availability = await harness.availability(product);
  harness.setCart([
    { variant: { id: "9003" }, quantity: 1 },
    { variant: { id: "9003" }, quantity: 2 },
    { variant: { id: "9004" }, quantity: 100 },
  ]);
  assertCap(harness, product, availability, 2);
  for (const held of [5, 6]) {
    harness.setCart([{ variant: { id: "9003" }, quantity: held }]);
    assertCap(harness, product, availability, 0);
  }
});

test("switching variants recalculates stock and held quantities before Add", async () => {
  const harness = createHarness();
  const payload = fixture(5);
  payload.variants[1].warehouse_stocks[0].quantity = 3;
  const product = harness.product(payload);
  const availability = await harness.availability(product);
  harness.setCart([{ variant: { id: "9004" }, quantity: 1 }]);
  for (let i = 0; i < 8; i++) harness.render(product, availability).increase.onClick();
  harness.render(product, availability).panel.onSelectVariant("9004");
  assert.equal(harness.render(product, availability).output, 2);
  assertCap(harness, product, availability, 2);
  harness.render(product, availability).panel.onSelectVariant("9003");
  assertCap(harness, product, availability, 5);
});

test("switching warehouses clamps an existing quantity and blocks unavailable stock", async () => {
  const harness = createHarness();
  const product = harness.product(fixture(20, [[6, 100], [7, 3], [8, 0]]));
  const first = await harness.availability(product, 6);
  for (let i = 0; i < 25; i++) harness.render(product, first).increase.onClick();
  const smaller = await harness.availability(product, 7);
  assert.equal(harness.render(product, smaller).output, 3);
  assertCap(harness, product, smaller, 3);
  for (const warehouse of [8, 9]) {
    const unavailable = await harness.availability(product, warehouse);
    const view = harness.render(product, unavailable);
    assert.equal(view.add.disabled, true);
    const before = harness.submissions.length;
    view.add.onClick({ currentTarget: {} });
    assert.equal(harness.submissions.length, before);
  }
  assertCap(harness, product, first, 20);
});
