import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import React from "react";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const base = "src/features/products/components/";
const cart = { lines: [], summary: { totalQuantity: 3, total: { amount: "115", currency: "SAR" } } };
function harness(selection) {
  const cache = new Map(), slots = [];
  let cursor = 0;
  const events = [], mutations = [];
  const stub = () => null;
  const primitives = new Proxy({}, { get: () => stub });
  function slot(value) { const index = cursor++; if (!(index in slots)) slots[index] = value; return index; }
  function load(relative) {
    const prefix = path.join(root, relative);
    const filename = [prefix, `${prefix}.tsx`, `${prefix}.ts`].find(existsSync);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = { exports: {} }; cache.set(filename, loaded);
    const output = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    const localRequire = (name) => {
      if (name === "react") return { ...React, useState: (value) => { const index = slot(value); return [slots[index], (next) => { slots[index] = next; }]; },
        useRef: (value) => slots[slot({ current: value })], useEffect: () => {}, useId: () => "test", useTransition: () => [false, (fn) => fn()] };
      if (name === "next-intl") return { useTranslations: () => Object.assign((key) => key, { raw: (key) => key }) };
      if (name === "@phosphor-icons/react") return { TrashIcon: stub };
      if (name === "@tanstack/react-query") return {
        useQueryClient: () => ({ invalidateQueries: () => events.push("invalidate"), fetchQuery: async () => cart, isMutating: () => 0, getQueryState: () => ({ data: { lines: [] }, status: "success", fetchStatus: "idle" }) }),
        useIsMutating: () => 0,
        useMutation: (options) => { mutations.push(options); return { mutate: (input) => events.push(["submit", input]), reset: () => {} }; },
        useQuery: ({ kind, select }) => select ? { data: 4 } : ({ data: kind === "selection" && selection ? { kind: "selection", data: selection } : { lines: [] } }),
      };
      if (name === "@/features/cart/api/cart-query") return { currentCartQueryKey: () => ["cart", "current"], currentCartQueryOptions: () => ({}), setCurrentCartQueryData: (_client, _locale, value) => events.push(["cart", value]) };
      if (name === "@/features/cart/actions/add-cart-line") return {};
      if (name === "@/features/cart/hooks/use-current-cart") return { useCurrentCart: () => ({ data: undefined }) };
      if (name === "@/features/cart/actions/update-cart-line" || name === "@/features/cart/actions/remove-cart-line") return {};
      if (name === "@/features/cart/api/cart-recommendation-lifecycle") return { beginRecommendationTransition: () => {
        events.push("transition-start");
        return { ready: Promise.resolve(), finish: () => events.push("transition-finish") };
      } };
      if (name === "@/features/cart/api/cart-recommendations-query") return { invalidateCartRecommendations: () => { events.push("recommendations-invalidated"); return Promise.resolve(); } };
      if (name === "@/features/products/api/quick-add-selection.client") return { quickAddSelectionQueryOptions: () => ({ kind: "selection" }) };
      if (name === "@/features/location/components/browsing-city-provider") return { useBrowsingCity: () => ({ committedCity: { id: 1 }, isChanging: false }) };
      if (name === "@/lib/rafal-toast") return { useRafalToast: () => ({ success: () => events.push("toast"), error: () => events.push("error") }) };
      if (name === "@/i18n/navigation") return { Link: stub, useRouter: () => ({ push: (url) => events.push(["navigate", url]) }) };
      if (name === "@radix-ui/react-dialog" || name.startsWith("@/components/ui/")) return primitives;
      if (name.startsWith("@/")) return load(`src/${name.slice(2)}`);
      if (name.startsWith(".")) return load(path.relative(root, path.resolve(path.dirname(filename), name)));
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(localRequire, loaded, loaded.exports);
    return loaded.exports;
  }
  return { load, events, mutations, render: (fn, props) => { cursor = 0; return fn(props); } };
}
const props = { locale: "en", productId: "1", productName: "Product", slug: "product", quickAdd: { kind: "direct", variantId: "2" } };
const children = (tree) => React.Children.toArray(tree.props.children);

test("direct Add writes Cart once, replaces toast only with custom handler, and blocks duplicate clicks", () => {
  for (const custom of [false, true]) {
    const h = harness(); const notified = [];
    const control = h.load(`${base}product-card/product-quick-add-control`).ProductQuickAddControl;
    const tree = h.render(control, { ...props, onAdded: custom ? (...args) => notified.push(args) : undefined });
    const button = children(tree)[0]; const trigger = { isConnected: true };
    button.props.ref.current = trigger;
    button.props.onClick(); button.props.onClick();
    assert.equal(h.events.filter((event) => event[0] === "submit").length, 1);
    h.mutations[0].onSuccess({ ok: true, cart });
    assert.equal(h.events.filter((event) => event[0] === "cart").length, 1);
    assert.equal(h.events.filter((event) => event === "recommendations-invalidated").length, 1);
    assert.equal(h.events.includes("toast"), !custom);
    assert.deepEqual(notified, custom ? [[cart, trigger]] : []);
  }
});

test("failed direct Add never confirms and personalized activation opens the modal", () => {
  const h = harness(); const notified = [];
  const control = h.load(`${base}product-card/product-quick-add-control`).ProductQuickAddControl;
  const tree = h.render(control, { ...props, quickAdd: { kind: "customize" }, onAdded: (...args) => notified.push(args) });
  children(tree)[0].props.onClick();
  assert.deepEqual(h.events, []);
  const opened = h.render(control, { ...props, quickAdd: { kind: "customize" } });
  assert.ok(children(opened).some(child => child?.props?.slug === "product" && child?.props?.cityId === 1));
  h.mutations[0].onSuccess({ ok: false, error: { code: "out-of-stock" } });
  h.mutations[0].onError();
  assert.deepEqual(notified, []);
  assert.equal(h.events.includes("recommendations-invalidated"), false);
});

test("direct and selector Adds hold the transition until Cart and success handling complete, including failures", async () => {
  for (const file of ["product-quick-add-control", "product-quick-add-sheet"]) for (const ok of [true, false]) {
    const h = harness();
    const component = h.load(`${base}product-card/${file}`)[file.endsWith("control") ? "ProductQuickAddControl" : "ProductQuickAddSheet"];
    h.render(component, { ...props, cityId: 1, returnFocusRef: { current: null }, onOpenChange: () => {} });
    const mutation = h.mutations[0];
    assert.deepEqual(mutation.mutationKey, ["cart", "mutation"]);
    assert.deepEqual(mutation.scope, { id: "cart" });
    const transition = await mutation.onMutate();
    assert.deepEqual(h.events, ["transition-start"]);
    await mutation.onSuccess(ok ? { ok: true, cart } : { ok: false, error: { code: "service-unavailable" } });
    assert.equal(h.events.includes("transition-finish"), false);
    mutation.onSettled(undefined, null, undefined, transition);
    assert.equal(h.events.at(-1), "transition-finish");
    assert.equal(h.events.includes("toast"), ok);
  }
});

test("selector success closes before notification, waits for focus release, and notifies once", () => {
  for (const custom of [false, true]) {
    const h = harness(); const trigger = { isConnected: true };
    const sheet = h.load(`${base}product-card/product-quick-add-sheet`).ProductQuickAddSheet;
    const tree = h.render(sheet, { ...props, cityId: 1, returnFocusRef: { current: trigger },
      onOpenChange: (open) => h.events.push(["open", open]),
      onAdded: custom ? (snapshot, element) => h.events.push(["confirmed", snapshot, element]) : undefined });
    h.mutations[0].onSuccess({ ok: true, cart });
    assert.deepEqual(h.events.slice(0, 3), [["cart", cart], "recommendations-invalidated", ["open", false]]);
    assert.equal(h.events.includes("toast"), !custom);
    assert.equal(h.events.some((event) => event[0] === "confirmed"), false);
    if (custom) {
      tree.props.onAfterClose(); tree.props.onAfterClose();
      assert.deepEqual(h.events.slice(3), [["confirmed", cart, trigger]]);
    }
  }
});

test("failed selector and ordinary dismissal do not queue confirmation", async () => {
  const h = harness(); let notified = false;
  const tree = h.render(h.load(`${base}product-card/product-quick-add-sheet`).ProductQuickAddSheet,
    { ...props, cityId: 1, returnFocusRef: { current: null }, onOpenChange: () => {}, onAdded: () => { notified = true; } });
  await h.mutations[0].onSuccess({ ok: false, error: { code: "service-unavailable" } });
  tree.props.onAfterClose();
  assert.equal(notified, false);
  assert.equal(h.events.includes("recommendations-invalidated"), false);
});

test("selector Add retains synchronous duplicate-submission protection", () => {
  const h = harness({ city: { id: 1, name: "City" }, product: { id: "1", name: "Product", options: [],
    variants: [{ id: "2", attributes: {}, optionValues: [], availability: { status: "available", maxOrderQuantity: 5 },
      pricing: { current: { amount: 10, currency: "SAR" }, compareAt: null } }] } });
  const tree = h.render(h.load(`${base}product-card/product-quick-add-sheet`).ProductQuickAddSheet,
    { ...props, cityId: 1, returnFocusRef: { current: null }, onOpenChange: () => {} });
  function find(node) {
    if (!React.isValidElement(node)) return null;
    if (node.props["data-quick-add-action"] === "add") return node;
    return React.Children.toArray(node.props.children).map(find).find(Boolean);
  }
  const button = find(tree);
  assert.equal(button.props.disabled, false);
  button.props.onClick(); button.props.onClick();
  assert.equal(h.events.filter((event) => event[0] === "submit").length, 1);
});

test("recommendation wrapper passes exact Cart, supports dismissal and checkout in both locales", () => {
  for (const locale of ["ar", "en"]) {
    const h = harness(); const component = h.load(`${base}recommendations/recommendation-quick-add`).RecommendationQuickAdd;
    const input = { locale, product: { id: "1", name: "Product", slug: "product", inStock: true, quickAdd: props.quickAdd } };
    const trigger = { isConnected: true };
    let tree = h.render(component, input);
    children(tree)[0].props.onAdded(cart, trigger);
    tree = h.render(component, input);
    let sheet = children(tree)[1];
    assert.equal(sheet.props.open, true); assert.equal(sheet.props.cart, cart);
    assert.equal(sheet.props.locale, locale); assert.equal(sheet.props.returnFocusRef.current, trigger);
    sheet.props.onOpenChange(false);
    assert.equal(children(h.render(component, input))[1].props.open, false);
    sheet.props.onCheckout();
    assert.deepEqual(h.events, [["navigate", "/checkout"]]);
  }
});

test("modal releases focus before handing off and works when opener has disconnected", () => {
  for (const isConnected of [true, false]) {
    const h = harness(); const modal = h.load("src/components/ui/rafal-modal").RafalModal;
    const tree = h.render(modal, { open: true, onOpenChange: () => {}, title: "Selector",
      returnFocusRef: { current: { isConnected, focus: () => h.events.push("focus") } },
      onAfterClose: () => h.events.push("handoff") });
    const content = children(tree.props.children)[1];
    content.props.onCloseAutoFocus({ preventDefault: () => {} });
    assert.deepEqual(h.events, isConnected ? ["focus", "handoff"] : ["handoff"]);
  }
});
