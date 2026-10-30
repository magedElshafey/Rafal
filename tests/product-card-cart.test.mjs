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
const root = process.cwd();
const key = (city = null) => ["cart", "current", "en", city];
const row = (id = "10", extra = {}) => ({ id, product: { id: "1" }, variant: { id: "2" },
  personalization: null, quantity: 2, availability: { cityId: 1, inStock: true, available: 5 }, ...extra });
const snapshot = (lines = [row()]) => ({ lines, maxCartItemQuantity: 4, gift: { isGift: false }, summary: { totalQuantity: 2 } });
const props = { locale: "en", productId: "1", productName: "Product", slug: "product", quickAdd: { kind: "direct", variantId: "2" } };
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
function harness(initial = snapshot()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  client.setQueryData(key(), initial); client.setQueryData(key(1), initial);
  const state = { response: null, calls: [], errors: [], reads: [], readFails: false, locked: false, deferred: null, recommendationRefreshes: 0 };
  const cache = new Map(), instances = new Map();
  let slots, cursor;
  function slot(create) { const i = cursor++; if (!(i in slots)) slots[i] = create(); return slots[i]; }
  const action = async (kind, lineId, quantity) => {
    state.calls.push({ kind, lineId, quantity });
    if (state.deferred) await state.deferred;
    if (state.response instanceof Error) throw state.response;
    if (state.response) return state.response;
    const current = client.getQueryData(key());
    const next = { ...current, lines: kind === "remove" ? current.lines.filter(l => l.id !== lineId)
      : current.lines.map(l => l.id === lineId ? { ...l, quantity } : l) };
    return { ok: true, cart: next };
  };
  function load(relative) {
    const base = path.resolve(root, relative);
    const filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = { exports: {} }; cache.set(filename, loaded);
    const output = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    const localRequire = name => {
      if (name === "react") return { ...React, useRef: value => slot(() => ({ current: value })),
        useState: value => { const s = slot(() => ({ value })); return [s.value, next => { s.value = next; }]; },
        useEffect: () => {}, useTransition: () => [false, fn => fn()] };
      if (name === "next-intl") return { useTranslations: () => key => key };
      if (name === "@tanstack/react-query") return {
        useQueryClient: () => client, useIsMutating: filters => client.isMutating(filters),
        useQuery: options => {
          const query = client.getQueryState(options.queryKey);
          return { data: options.select(query?.data), isError: query?.status === "error", isSuccess: query?.status === "success" };
        },
        useMutation: options => {
          const observer = slot(() => new MutationObserver(client, options)); observer.setOptions(options);
          return { ...observer.getCurrentResult(), mutate: input => { void observer.mutate(input).catch(() => {}); } };
        }, queryOptions: options => options,
      };
      if (name === "@/features/cart/hooks/use-current-cart") return { useCurrentCart: (_locale, city = null) => {
        const query = client.getQueryState(key(city));
        return { data: query?.isInvalidated ? client.getQueryData(key()) : query?.data,
          projectedCart: query?.data, fulfillmentCityId: city,
          projectionReady: !query?.isInvalidated && query?.fetchStatus !== "fetching",
          isError: query?.status === "error", isFetching: query?.fetchStatus === "fetching" };
      } };
      if (name === "@/features/cart/actions/update-cart-line") return { updateCartLine: (id, qty) => action("update", id, qty) };
      if (name === "@/features/cart/actions/remove-cart-line") return { removeCartLine: id => action("remove", id) };
      if (name === "@/features/cart/actions/add-cart-line") return { addCartLine: input => action("add", input.variantId, input.quantity) };
      if (name === "@/features/cart/api/cart-recommendations-query") return { invalidateCartRecommendations: async () => { state.recommendationRefreshes++; } };
      if (name === "@/features/cart/api/cart-recommendation-lifecycle") return { beginRecommendationTransition: () => ({ ready: Promise.resolve(), finish() {} }) };
      if (name === "@/features/location/components/browsing-city-provider") return { useBrowsingCity: () => ({ committedCity: { id: 1 }, isChanging: state.locked }) };
      if (name === "@/lib/rafal-toast") return { useRafalToast: () => ({ success() {}, error: value => state.errors.push(value) }) };
      if (name === "@/i18n/navigation") return { useRouter: () => ({ push() {} }) };
      if (name.includes("product-quick-add-sheet")) return { ProductQuickAddSheet: () => null };
      if (name === "@phosphor-icons/react") return { TrashIcon: () => null };
      if (name === "@/components/ui/icon-button") return { IconButton: "button" };
      if (name.startsWith("@/")) return load(`src/${name.slice(2)}`);
      return require(name);
    };
    // Cart GET is synthetic; real cache and response publication utilities execute.
    const fetch = async url => { state.reads.push(url); if (state.readFails) throw new Error("offline");
      return { ok: true, json: async () => initial }; };
    vm.runInThisContext(`(function(require,module,exports,fetch){${output}\n})`, { filename })(localRequire, loaded, loaded.exports, fetch);
    return loaded.exports;
  }
  const component = load("src/features/products/components/product-card/product-quick-add-control").ProductQuickAddControl;
  const render = (id = "a", extra = {}) => {
    if (!instances.has(id)) instances.set(id, []);
    slots = instances.get(id); cursor = 0;
    return component({ ...props, ...extra });
  };
  return { state, client, render, load };
}
function find(tree, predicate) {
  if (!React.isValidElement(tree)) return null;
  if (predicate(tree)) return tree;
  for (const child of React.Children.toArray(tree.props.children)) { const found = find(child, predicate); if (found) return found; }
  return null;
}
const button = (tree, label) => find(tree, el => el.props["aria-label"] === label);

test("only a single non-personalized product line replaces Quick Add", () => {
  for (const [lines, inline] of [[[], false], [[row()], true], [[row(), row("11")], false],
    [[row("10", { personalization: { text: "Name" } })], false], [[row(), row("11", { product: { id: "other" } })], true]]) {
    const h = harness(snapshot(lines)); const tree = h.render();
    assert.equal(!!button(tree, "increase"), inline);
    assert.equal(!!button(tree, "add"), !inline);
  }
});

test("absolute edits use latest canonical quantity and reject rapid/cross-card clicks", async () => {
  const h = harness(); let release; h.state.deferred = new Promise(resolve => { release = resolve; });
  const a = h.render("a"), b = h.render("b");
  h.client.setQueryData(key(), snapshot([row("10", { quantity: 3 })]));
  button(a, "increase").props.onClick(); button(a, "increase").props.onClick(); button(b, "increase").props.onClick();
  await tick(); assert.deepEqual(h.state.calls, [{ kind: "update", lineId: "10", quantity: 4 }]);
  release(); await tick();
  assert.equal(find(h.render("b"), el => el.type === "output").props.children, 4);
  assert.equal(find(h.render("b"), el => el.props.role === "status").props.children, "");
  assert.ok(find(h.render("a"), el => el.props.role === "status").props.children);
  assert.equal(button(h.render("a"), "increase").props.disabled, true);
});

test("decrement and Delete target the cart line; one disables decrement", async () => {
  const h = harness(); button(h.render(), "decrease").props.onClick(); await tick();
  assert.equal(h.client.getQueryData(key()).lines[0].quantity, 1);
  assert.equal(h.state.recommendationRefreshes, 0);
  assert.equal(button(h.render(), "decrease").props.disabled, true);
  button(h.render(), "remove").props.onClick(); await tick();
  assert.deepEqual(h.state.calls.map(c => [c.kind, c.lineId]), [["update", "10"], ["remove", "10"]]);
  assert.ok(button(h.render(), "add"));
  assert.equal(h.state.recommendationRefreshes, 1);
});

test("unresolved, wrong-city, exhausted stock and configured limits prevent increments", () => {
  for (const change of [s => { s.maxCartItemQuantity = null; }, s => { s.maxCartItemQuantity = 2; },
    s => { s.lines[0].availability.available = 2; }, s => { delete s.lines[0].availability; },
    s => { s.lines[0].availability.cityId = 2; }, s => { s.lines[0].availability.inStock = false; }]) {
    const value = snapshot(); change(value); const h = harness(value); const tree = h.render();
    assert.equal(button(tree, "increase").props.disabled, true);
    button(tree, "increase").props.onClick(); assert.equal(h.client.isMutating(), 0);
  }
});

test("stale line identity and newly ambiguous membership cannot mutate", () => {
  for (const lines of [[row("new")], [row(), row("11")]]) {
    const h = harness(); const tree = h.render(); h.client.setQueryData(key(), snapshot(lines));
    button(tree, "remove").props.onClick(); button(tree, "increase").props.onClick();
    assert.equal(h.client.isMutating(), 0);
  }
});

test("city changes and pending/invalidated availability reject stale increment handlers", () => {
  for (const mode of ["gift", "transition", "invalidated"]) {
    const h = harness();
    if (mode === "transition") h.state.locked = true;
    const tree = h.render();
    if (mode === "gift") h.client.setQueryData(key(), { ...snapshot(), gift: { isGift: true, recipient: { city: { id: 2 } } } });
    if (mode === "invalidated") void h.client.invalidateQueries({ queryKey: key(1), exact: true, refetchType: "none" });
    button(tree, "increase").props.onClick();
    assert.equal(h.client.isMutating(), 0);
  }
});

test("Arabic and English labels include the product and all actions remain native buttons", () => {
  for (const locale of ["ar", "en"]) {
    const copy = JSON.parse(readFileSync(path.join(root, `src/messages/${locale}/common.json`), "utf8")).productListing.quickAdd;
    for (const action of ["increase", "decrease", "remove"]) assert.ok(copy[action].includes("{name}"));
  }
  const h = harness();
  for (const label of ["increase", "decrease", "remove"]) assert.equal(button(h.render(), label).type, "button");
});

test("rejected and uncertain updates reconcile without retrying mutations or optimistic quantity", async () => {
  for (const failure of [{ ok: false, error: { code: "out-of-stock" } }, new Error("uncertain")]) {
    const h = harness(); h.state.response = failure;
    button(h.render(), "increase").props.onClick(); await tick(); await tick();
    assert.equal(h.state.calls.length, 1); assert.equal(h.state.errors.length, 1);
    assert.equal(h.state.reads.length, 2);
    assert.equal(h.client.getQueryData(key()).lines[0].quantity, 2);
  }
});

test("failed reconciliation locks edits until explicit read recovery", async () => {
  const h = harness(); h.state.response = new Error("uncertain"); h.state.readFails = true;
  button(h.render(), "remove").props.onClick(); await tick(); await tick();
  const tree = h.render(); assert.equal(button(tree, "increase").props.disabled, true);
  button(tree, "remove").props.onClick(); assert.equal(h.state.calls.length, 1);
  h.state.readFails = false;
  find(tree, el => el.type === "button" && el.props.children === "sheet.retry").props.onClick();
  await tick(); assert.equal(h.state.calls.length, 1);
});

test("existing direct Quick Add and inline edits share the mutation lock", async () => {
  const h = harness(); let release; h.state.deferred = new Promise(resolve => { release = resolve; });
  const add = h.render("other", { productId: "other" }); const inline = h.render();
  button(add, "add").props.onClick(); button(inline, "increase").props.onClick();
  await tick(); assert.equal(h.state.calls.length, 1); assert.equal(h.state.calls[0].kind, "add");
  release(); await tick();
});

test("unrelated cards remain visually enabled during another mutation and background refresh", async () => {
  const h = harness(); let release; h.state.deferred = new Promise(resolve => { release = resolve; });
  button(h.render("a"), "increase").props.onClick();
  await tick();
  const duplicate = h.render("b");
  assert.equal(button(duplicate, "increase").props.disabled, false);
  assert.equal(button(h.render("other", { productId: "other" }), "add").props.disabled, false);
  assert.equal(button(h.render("a"), "increase").props.disabled, true);
  button(duplicate, "increase").props.onClick();
  assert.equal(h.state.calls.length, 1);
  release(); await tick();
  // Projection invalidation changes safety, not the last known presentation.
  void h.client.invalidateQueries({ queryKey: key(1), exact: true, refetchType: "none" });
  assert.equal(button(h.render("b"), "increase").props.disabled, false);
  button(h.render("b"), "increase").props.onClick();
  assert.equal(h.state.calls.length, 1);
});

test("mutation snapshots preserve settings without claiming refreshed availability", () => {
  const h = harness();
  const incoming = snapshot(); delete incoming.maxCartItemQuantity;
  h.load("src/features/cart/api/cart-query").setCurrentCartQueryData(h.client, "en", incoming);
  assert.equal(h.client.getQueryData(key()).maxCartItemQuantity, 4);
  assert.equal(h.client.getQueryData(key()).lines[0].availability, undefined);
  assert.equal(h.client.getQueryState(key(1)).isInvalidated, true);
});
