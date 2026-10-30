import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import React from "react";
import ts from "typescript";
import { QueryClient, MutationObserver } from "@tanstack/react-query";

const require = createRequire(import.meta.url);
const key = (city = null) => ["cart", "current", "en", city];
const line = (variant = "s", id = "10", extra = {}) => ({ id, product: { id: "1" }, variant: { id: variant }, personalization: null, quantity: 2,
  availability: { cityId: 1, inStock: true, available: 6 }, ...extra });
const snapshot = (lines = [line()]) => ({ lines, maxCartItemQuantity: 5, gift: { isGift: false }, summary: { totalQuantity: 2 } });
const variant = id => ({ id, attributes: { size: id }, imageIds: [], pricing: { current: { amount: 10, currency: "SAR" } } });
const props = { locale: "en", product: { id: "1", name: "Product", images: [], options: [{ id: "size", values: [{ id: "s" }, { id: "m" }] }],
  variants: [variant("s"), variant("m")], personalization: { enabled: false } },
  availabilityByVariantId: { s: { status: "available", maxOrderQuantity: 5 }, m: { status: "available", maxOrderQuantity: 5 } },
  copy: { gallery: {}, panel: { quantity: { labelTemplate: "Quantity {value}", title: "Quantity" } }, purchase: { sticky: {}, success: {}, errors: { serviceUnavailable: "Failed", outOfStock: "No stock" } } } };
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
function harness(initial = snapshot(), personalizable = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  client.setQueryData(key(), initial); client.setQueryData(key(1), initial);
  const state = { server: structuredClone(initial), calls: [], reads: [], deferred: null, response: null, readFails: false, city: 1 };
  const modules = new Map(), slots = []; let cursor = 0, effects = [];
  const slot = create => { const i = cursor++; if (!(i in slots)) slots[i] = create(); return slots[i]; };
  const Panel = () => null, Sticky = () => null, Success = () => null;
  const act = async (kind, input) => {
    state.calls.push({ kind, ...input }); if (state.deferred) await state.deferred;
    if (state.response instanceof Error) throw state.response;
    if (state.response) return state.response;
    state.server.lines = kind === "add" ? [...state.server.lines, line(input.variantId, "new", { quantity: input.quantity })]
      : kind === "remove" ? state.server.lines.filter(l => l.id !== input.lineId)
      : state.server.lines.map(l => l.id === input.lineId ? { ...l, quantity: input.quantity } : l);
    return { ok: true, cart: structuredClone(state.server) };
  };
  function load(relative) {
    const base = path.resolve(relative), filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loaded = { exports: {} }; modules.set(filename, loaded);
    const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const localRequire = name => {
      if (name === "react") return { ...React, useRef: value => slot(() => ({ current: value })), useEffect: fn => effects.push(fn),
        useState: value => { const s = slot(() => ({ value: typeof value === "function" ? value() : value })); return [s.value, next => { s.value = typeof next === "function" ? next(s.value) : next; }]; } };
      if (name === "next-intl") return { useTranslations: () => key => key };
      if (name === "@tanstack/react-query") return { queryOptions: options => options, useQueryClient: () => client,
        useQuery: options => { const s = client.getQueryState(options.queryKey); return { data: options.select(s.data), isError: s.status === "error" }; },
        useMutation: options => { const observer = slot(() => new MutationObserver(client, options)); observer.setOptions(options);
          return { ...observer.getCurrentResult(), mutate: value => { void observer.mutate(value).catch(() => {}); } }; } };
      if (name === "@/features/cart/hooks/use-current-cart") return { useCurrentCart: () => {
        const canonical = client.getQueryData(key());
        const city = canonical.gift.isGift ? canonical.gift.recipient.city.id : state.city;
        const query = client.getQueryState(key(city));
        return { data: query?.isInvalidated ? canonical : query?.data ?? canonical, projectedCart: query?.data, fulfillmentCityId: city,
          projectionReady: !!query && !query.isInvalidated && query.status === "success" && query.fetchStatus !== "fetching", isError: query?.status === "error" };
      } };
      if (name === "@/features/cart/actions/add-cart-line") return { addCartLine: input => act("add", input) };
      if (name === "@/features/cart/actions/update-cart-line") return { updateCartLine: (lineId, quantity) => act("update", { lineId, quantity }) };
      if (name === "@/features/cart/actions/remove-cart-line") return { removeCartLine: lineId => act("remove", { lineId }) };
      if (name === "@/features/cart/api/cart-recommendations-query") return { invalidateCartRecommendations: async () => {} };
      if (name === "@/features/cart/api/cart-recommendation-lifecycle") return { beginRecommendationTransition: () => ({ ready: Promise.resolve(), finish() {} }) };
      if (name === "@/features/location/components/browsing-city-provider") return { useBrowsingCity: () => ({ committedCity: { id: state.city }, isChanging: false }) };
      if (name === "@/i18n/navigation") return { useRouter: () => ({ push() {} }) };
      if (name.endsWith("product-purchase-panel")) return { ProductPurchasePanel: Panel };
      if (name.endsWith("product-sticky-purchase-actions")) return { ProductStickyPurchaseActions: Sticky };
      if (name.endsWith("product-purchase-success-sheet")) return { ProductPurchaseSuccessSheet: Success };
      if (name.includes("components/product-details/product-gallery")) return { ProductGallery: () => null };
      if (name === "@/components/ui/icon-button") return { IconButton: "button" };
      if (name === "@phosphor-icons/react") return { TrashIcon: () => null };
      if (name.startsWith("@/")) return load(`src/${name.slice(2)}`);
      return require(name);
    };
    const fetch = async url => { state.reads.push(url); if (state.readFails) throw new Error("offline"); return { ok: true, json: async () => structuredClone(state.server) }; };
    vm.runInThisContext(`(function(require,module,exports,fetch){${code}\n})`, { filename })(localRequire, loaded, loaded.exports, fetch);
    return loaded.exports;
  }
  const Component = load("src/features/products/components/product-details/product-purchase-experience").ProductPurchaseExperience;
  const render = () => {
    cursor = 0; effects = [];
    const tree = Component({ ...props, product: { ...props.product, personalization: personalizable
      ? { enabled: true, allowedLanguages: ["english"], maxLength: 20, characterPolicy: "letters-and-spaces" } : { enabled: false } } });
    effects.forEach(fn => fn());
    return { tree, panel: find(tree, e => e.type === Panel).props, sticky: find(tree, e => e.type === Sticky).props, success: find(tree, e => e.type === Success).props };
  };
  return { client, state, render, load };
}
function find(tree, predicate) {
  if (!React.isValidElement(tree)) return null;
  if (predicate(tree)) return tree;
  for (const child of React.Children.toArray(tree.props.children)) { const result = find(child, predicate); if (result) return result; }
  return null;
}
const button = (controls, label) => find(controls, e => e.props["aria-label"] === label);
const event = { currentTarget: { closest: () => null } };

test("PDP matches exact product and selected variant, excluding ambiguity and personalizable products", () => {
  for (const [lines, personalizable, editable] of [[[line()], false, true], [[], false, false], [[line("m")], false, false],
    [[line(), line("s", "11")], false, false], [[line("s", "10", { personalization: { text: "Name" } })], false, false], [[line()], true, false]]) {
    const h = harness(snapshot(lines), personalizable); assert.equal(!!h.render().panel.cartControls, editable);
  }
});

test("variant changes replace membership, reset draft, and reject old handlers synchronously", async () => {
  const h = harness(); const old = h.render();
  old.panel.onSelectOption("size", "m");
  button(old.panel.cartControls, "increase").props.onClick(event);
  assert.equal(h.client.isMutating(), 0);
  const next = h.render(); assert.equal(next.panel.cartControls, undefined); assert.equal(next.panel.quantity, 1);
  next.panel.onAddToCart(event); next.sticky.onAddToCart(event); await tick();
  assert.equal(h.state.calls.length, 1); assert.equal(h.state.calls[0].variantId, "m");
  const added = h.render(); assert.equal(added.panel.selectedOptions.size, "m"); assert.ok(added.panel.cartControls);
  assert.strictEqual(added.panel.cartControls, added.sticky.cartControls);
});

test("latest canonical quantity drives edits; rapid main/sticky clicks submit once and synchronize cache", async () => {
  const h = harness(); const view = h.render();
  h.client.setQueryData(key(), snapshot([line("s", "10", { quantity: 3 })]));
  button(view.panel.cartControls, "increase").props.onClick(event); button(view.sticky.cartControls, "increase").props.onClick(event);
  await tick(); assert.deepEqual(h.state.calls, [{ kind: "update", lineId: "10", quantity: 4 }]);
  assert.equal(h.client.getQueryData(key()).lines[0].quantity, 4);
  assert.equal(find(h.render().panel.cartControls, e => e.type === "output").props.children, 4);
});

test("decrement stops at one; Delete returns to Add and restores focus in its initiating surface", async () => {
  const h = harness(); button(h.render().panel.cartControls, "decrease").props.onClick(event); await tick();
  assert.equal(button(h.render().panel.cartControls, "decrease").props.disabled, true);
  let focused = false; const surface = { closest: () => null, querySelector: () => ({ focus() { focused = true; } }) };
  button(h.render().sticky.cartControls, "remove").props.onClick({ currentTarget: { closest: () => surface } }); await tick();
  const view = h.render(); assert.equal(view.panel.cartControls, undefined); assert.equal(view.panel.quantity, 1); assert.equal(focused, true);
  assert.deepEqual(h.state.calls.map(c => c.kind), ["update", "remove"]);
});

test("gift-city stock, configured limits, and unresolved projection block unsafe increments", () => {
  for (const mode of ["limit", "stock", "missing", "gift"]) {
    const cart = snapshot(); if (mode === "limit") cart.maxCartItemQuantity = 2;
    if (mode === "stock") cart.lines[0].availability.available = 2;
    if (mode === "missing") delete cart.lines[0].availability;
    if (mode === "gift") cart.gift = { isGift: true, recipient: { city: { id: 2 } } };
    const h = harness(cart); const view = h.render();
    assert.equal(button(view.panel.cartControls, "increase").props.disabled, true);
    button(view.panel.cartControls, "increase").props.onClick(event); assert.equal(h.client.isMutating(), 0);
  }
  const h = harness(); const cart = snapshot([line(), line("s", "other", { quantity: 2 })]);
  assert.equal(h.load("src/features/products/utils/pdp-cart-selection").getPdpCartLineCeiling(cart, cart, "10", 1), 3);
});

test("existing cart mutation blocks PDP submission without global pending presentation", async () => {
  const h = harness(); let release;
  const operation = new MutationObserver(h.client, { mutationKey: ["cart", "mutation"], scope: { id: "cart" }, mutationFn: () => new Promise(r => { release = r; }) });
  const running = operation.mutate(); await tick();
  const view = h.render(); assert.equal(button(view.panel.cartControls, "increase").props.disabled, false);
  button(view.panel.cartControls, "increase").props.onClick(event); assert.equal(h.state.calls.length, 0);
  release(); await running;
});

test("failed/uncertain edits reconcile without retries; failed reads offer recovery", async () => {
  for (const result of [{ ok: false, error: { code: "out-of-stock" } }, new Error("uncertain")]) {
    const h = harness(); h.state.response = result;
    button(h.render().panel.cartControls, "increase").props.onClick(event); await tick(); await tick();
    assert.equal(h.state.calls.length, 1); assert.equal(h.state.reads.length, 2);
    assert.ok(h.render().panel.addToCartErrorMessage); assert.equal(h.client.getQueryData(key()).lines[0].quantity, 2);
  }
  const h = harness(); h.state.response = new Error("uncertain"); h.state.readFails = true;
  button(h.render().panel.cartControls, "increase").props.onClick(event); await tick(); await tick();
  const view = h.render(); assert.equal(button(view.panel.cartControls, "increase").props.disabled, true);
  h.state.readFails = false;
  find(view.panel.cartControls, e => e.type === "button" && e.props.children === "sheet.retry").props.onClick(); await tick();
  assert.equal(h.state.calls.length, 1);
});

test("stale identity cannot delete a replacement line or newly ambiguous selection", () => {
  for (const lines of [[line("s", "replacement")], [line(), line("s", "other")]]) {
    const h = harness(); const view = h.render(); h.client.setQueryData(key(), snapshot(lines));
    button(view.panel.cartControls, "remove").props.onClick(event); assert.equal(h.client.isMutating(), 0);
  }
});

test("Add preserves the chosen options, resets its draft and rejects old variant handlers", async () => {
  const h = harness(snapshot([])); const first = h.render();
  first.panel.onSelectOption("size", "m"); first.panel.onAddToCart(event);
  assert.equal(h.state.calls.length, 0);
  h.render().panel.onIncreaseQuantity(); h.render().panel.onIncreaseQuantity();
  const selected = h.render(); assert.equal(selected.panel.quantity, 3);
  selected.panel.onAddToCart(event); selected.panel.onAddToCart(event); await tick();
  assert.equal(h.state.calls.length, 1); assert.equal(h.state.calls[0].quantity, 3);
  const added = h.render(); assert.equal(added.panel.selectedOptions.size, "m");
  assert.equal(added.panel.quantity, 1); assert.equal(find(added.panel.cartControls, e => e.type === "output").props.children, 3);
});

test("switching variants while an edit is in flight never applies it to the new selection", async () => {
  const h = harness(snapshot([line(), line("m", "20", { quantity: 1 })]));
  let release; h.state.deferred = new Promise(resolve => { release = resolve; });
  button(h.render().panel.cartControls, "increase").props.onClick(event); await tick();
  h.render().panel.onSelectOption("size", "m");
  const next = h.render(); assert.equal(find(next.panel.cartControls, e => e.type === "output").props.children, 1);
  button(next.panel.cartControls, "increase").props.onClick(event);
  release(); await tick();
  assert.equal(h.state.calls.length, 1);
  assert.equal(h.client.getQueryData(key()).lines.find(l => l.id === "20").quantity, 1);
});

test("successful Add updates the success sheet's focus target to the new cart controls", async () => {
  const h = harness(snapshot([])); const control = { focus() {} };
  const surface = { querySelector: () => control };
  h.render().panel.onAddToCart({ currentTarget: { isConnected: true, closest: () => surface } });
  await tick();
  assert.strictEqual(h.render().success.returnFocusRef.current, control);
});

test("Delete focuses the stable purchase region when Add is unavailable", async () => {
  const h = harness(); let focused = false;
  const surface = { closest: () => null, querySelector: () => ({ disabled: true }), focus: () => { focused = true; } };
  button(h.render().panel.cartControls, "remove").props.onClick({ currentTarget: { closest: () => surface } });
  await tick(); h.render(); assert.equal(focused, true);
});
