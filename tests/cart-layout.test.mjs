import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import ts from "typescript";

const require = createRequire(import.meta.url);
const money = { amount: "115", currency: "SAR" };
const zero = { ...money, amount: "0" };
const cart = {
  lines: [{ id: "1", quantity: 1, product: { slug: "product", name: "Product" },
    variant: { sku: "sku", attributes: {} }, availability: { cityId: 1, inStock: true, available: 5 },
    stock: { status: "ok" }, lineTotal: money, unitPrice: money }],
  coupon: null, gift: { isGift: false },
  summary: { totalQuantity: 1, total: money, subtotal: money, productDiscountTotal: zero,
    personalizationTotal: zero, giftWrapFee: zero, couponDiscount: zero, vat: { includedAmount: zero },
    freeShipping: { enabled: true, qualifies: true } },
};
const copy = { title: "Cart", checkout: "Checkout", total: "Total", summary: "Summary", clear: "Clear",
  freeShippingQualified: "Free shipping", stock: { ok: "Available" }, errors: {}, coupon: {},
  availability: { checkoutUnavailable: "Unavailable" } };

function harness(overrides = {}) {
  const events = [], slots = [];
  let cursor = 0;
  const state = { cart, projectionReady: true, projectedCart: cart, fulfillmentCityId: 1, ...overrides };
  const mutations = { projectionDirty: false, projectionPending: false,
    flushPendingMutations: async () => { events.push("flush"); return { ok: true }; },
    refreshProjection: async () => { events.push("refresh"); return state.cart; },
    canNavigate: () => true, ...overrides.mutations };
  const slot = (value) => { const index = cursor++; if (!(index in slots)) slots[index] = value; return index; };
  const stubs = {
    react: { ...React, useCallback: (fn) => fn, useEffect: () => {}, useLayoutEffect: () => {},
      useRef: (value) => slots[slot({ current: value })],
      useState: (value) => { const index = slot(value); return [slots[index], (next) => { slots[index] = next; }]; },
      useTransition: () => [!!state.navigationPending, (fn) => fn()] },
    "next/image": { default: "img" },
    "@phosphor-icons/react/dist/ssr/CircleNotch": { CircleNotchIcon: "svg" },
    "@/components/ui/button": { Button: "button" },
    "@/components/ui/icons": { TruckIcon: "svg", XIcon: "svg" },
    "@/components/ui/skeleton": { Skeleton: "span" },
    "@/components/ui/variant-attribute-value": { VariantAttributeValue: "span" },
    "@/features/cart/components/cart-gift": { CartGift: "gift" },
    "@/features/cart/components/cart-coupon": { CartCoupon: "coupon" },
    "@/features/cart/components/cart-recommendations": { CartRecommendationRows: "recommendations" },
    "@/features/cart/hooks/use-current-cart": { useCurrentCart: () => ({ ...state, data: state.cart }) },
    "@/features/cart/hooks/use-cart-page-mutations": { useCartPageMutations: () => mutations },
    "@/features/cart/hooks/use-cart-recommendations": { useCartRecommendations: () => ({ status: "success" }) },
    "@/features/location/components/browsing-city-provider": { useBrowsingCity: () => ({
      committedCity: { id: 1 }, isChanging: !!state.cityLocked, status: "idle" }) },
    "@/features/cart/utils/cart-checkout-context": { createCartCheckoutContextSnapshot: (value) => value,
      updateCartCheckoutContextSnapshot: (_previous, value) => value, canContinueCartCheckout: () => !state.cityLocked },
    "@/i18n/navigation": { Link: "a", useRouter: () => ({ push: (url) => events.push(url) }) },
    "@/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
    "@/lib/variant-attributes": { getVariantAttributeEntries: () => [] },
  };
  const file = new URL("../src/features/cart/components/cart-page.tsx", import.meta.url);
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const loaded = { exports: {} };
  let resize, disconnected = false;
  class Observer {
    constructor(fn) { resize = fn; }
    observe() {}
    disconnect() { disconnected = true; }
  }
  vm.runInThisContext(`(function(require,module,exports,ResizeObserver){${code}\n})`)(
    (name) => stubs[name] ?? require(name), loaded, loaded.exports, Observer);
  return { state, events, resize: () => resize(), disconnected: () => disconnected,
    render: (props = {}) => { cursor = 0; return loaded.exports.CartPage({ initialCart: cart, locale: "en",
      copy, availableCoupons: [], canUseCoupons: true, couponDiscoveryFailed: false, maxQuantity: 10, ...props }); } };
}

function nodes(tree) {
  if (!React.isValidElement(tree)) return [];
  if (typeof tree.type === "function") return nodes(tree.type(tree.props));
  return [tree, ...React.Children.toArray(tree.props.children).flatMap(nodes)];
}
const checkout = (tree) => nodes(tree).filter((node) => node.type === "button" && node.props.children === copy.checkout);

test("Cart DOM order is shipping, items, eligible coupon, gift, summary, then full-width recommendations in AR/EN", () => {
  for (const locale of ["ar", "en"]) for (const eligible of [true, false]) {
    const h = harness(), tree = h.render({ locale, canUseCoupons: eligible }), all = nodes(tree);
    const positions = [all.findIndex((n) => n.props["aria-label"] === "Free shipping"),
      all.findIndex((n) => n.type === "ul"),
      ...(eligible ? [all.findIndex((n) => n.type === "coupon")] : []),
      all.findIndex((n) => n.type === "gift"), all.findIndex((n) => n.type === "aside"),
      all.findIndex((n) => n.type === "recommendations")];
    assert.ok(positions.every((value, index) => value >= 0 && (!index || value > positions[index - 1])));
    assert.equal(all.filter((n) => n.type === "coupon").length, Number(eligible));
    const gift = all.find((n) => n.type === "gift");
    assert.equal(gift.props.gift, cart.gift);
    assert.equal(gift.props.locale, locale);
    assert.equal(all.find((n) => n.type === "aside").props.dir, locale === "ar" ? "rtl" : "ltr");
    const children = React.Children.toArray(tree.props.children);
    assert.equal(children.at(-1).type, "recommendations");
    assert.match(children.at(-2).props.className, /lg:grid-cols/);
  }
});

test("one responsive checkout action shares totals, eligibility and the existing navigation sequence", async () => {
  const h = harness(), tree = h.render(), [button] = checkout(tree);
  assert.equal(checkout(tree).length, 1);
  assert.equal(button.props.disabled, false);
  assert.equal(button.props["aria-describedby"], undefined);
  assert.equal(checkout(harness({ fulfillmentCityId: 2 }).render())[0].props["aria-describedby"], "cart-checkout-unavailable");
  const bar = nodes(tree).find((n) => n.props.ref && typeof n.props.ref === "function");
  assert.match(bar.props.className, /fixed.*mobile-bottom-navigation-height.*safe-area-inset-bottom.*md:static/);
  assert.ok(nodes(bar).some((n) => n.type === "bdi" && n.props.children === new Intl.NumberFormat("en", { style: "currency", currency: "SAR" }).format(115)));
  const request = button.props.onClick();
  assert.equal(checkout(h.render())[0].props.loading, true);
  await request;
  assert.deepEqual(h.events, ["flush", "refresh", "/checkout"]);
});

test("pending, invalid, and empty Cart states cannot expose an enabled checkout", () => {
  for (const state of [{ cityLocked: true }, { projectionReady: false }, { isError: true },
    { mutations: { projectionPending: true } }, { mutations: { projectionDirty: true } },
    { navigationPending: true }, { fulfillmentCityId: 2 }]) {
    assert.equal(checkout(harness(state).render())[0].props.disabled, true);
  }
  for (const state of [{ cart: { ...cart, lines: [] } }, { isPending: true }, { cart: null, isError: true }]) {
    assert.equal(checkout(harness(state).render()).length, 0);
  }
});

test("checkout does not navigate after a rejected flush or an unavailable refreshed Cart", async () => {
  for (const mutations of [{ flushPendingMutations: async () => ({ ok: false }) },
    { refreshProjection: async () => ({ ...cart, lines: [] }) }, { canNavigate: () => false }]) {
    const h = harness({ mutations });
    await checkout(h.render())[0].props.onClick();
    assert.ok(!h.events.includes("/checkout"));
  }
});

test("mobile content clearance follows the checkout bar height and observer cleanup", () => {
  const h = harness(), tree = h.render();
  assert.match(tree.props.className, /pb-\[calc\(var\(--cart-checkout-height/);
  assert.match(tree.props.className, /scroll-mb/);
  const bar = nodes(tree).find((n) => typeof n.props.ref === "function");
  const values = new Map(); let height = 80;
  const cleanup = bar.props.ref({ closest: () => ({ style: {
    setProperty: (key, value) => values.set(key, value), removeProperty: (key) => values.delete(key),
  } }), getBoundingClientRect: () => ({ height }) });
  assert.equal(values.get("--cart-checkout-height"), "80px");
  height = 130; h.resize();
  assert.equal(values.get("--cart-checkout-height"), "130px");
  cleanup(); assert.equal(h.disconnected(), true); assert.equal(values.size, 0);
});
