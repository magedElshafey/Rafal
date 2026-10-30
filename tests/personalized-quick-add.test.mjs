import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { QueryClient, MutationObserver } from "@tanstack/react-query";

const require = createRequire(import.meta.url);
const cartKey = ["cart", "current", "en", null];
const config = { enabled: true, maxLength: 20, allowedLanguages: ["english"], additionalFee: { amount: 5, currency: "SAR" } };
const option = (id, attributes = {}) => ({ id, attributes, pricing: { current: { amount: 10, currency: "SAR" } }, availability: { status: "available", maxOrderQuantity: 5 } });
function harness(personalization = config, variants = [option("17")], locale = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  client.setQueryData(cartKey, { lines: [], gift: { isGift: false } });
  const state = { calls: [], reads: 0, failure: null, readFails: false, deferred: null, city: 1, closed: false,
    selection: { city: { id: 1, name: "City" }, product: { id: "1", slug: "product", name: "Product", personalization, options: [], variants } } };
  const slots = [], modules = new Map(); let cursor = 0;
  const slot = init => { const index = cursor++; if (!(index in slots)) slots[index] = init(); return slots[index]; };
  function load(relative) {
    const base = path.resolve(relative), file = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    if (modules.has(file)) return modules.get(file).exports;
    const loaded = { exports: {} }; modules.set(file, loaded);
    const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const localRequire = name => {
      if (locale && name === "react") return React;
      if (locale && name === "next-intl") return { useTranslations: () => {
        const copy = JSON.parse(readFileSync(`src/messages/${locale}/common.json`, "utf8")).productDetails.personalization;
        return (key, values = {}) => key.split(".").reduce((value, part) => value[part], copy).replace(/\{(\w+)\}/g, (_, key) => values[key]);
      } };
      if (name === "react") return { ...React, useEffect: fn => fn(), useId: () => "fixture", useRef: value => slot(() => ({ current: value })),
        useState: value => { const s = slot(() => ({ value })); return [s.value, next => { s.value = typeof next === "function" ? next(s.value) : next; }]; } };
      if (name === "next-intl") return { useTranslations: () => key => key };
      if (name === "@tanstack/react-query") return { queryOptions: o => o, useQueryClient: () => client,
        useQuery: options => {
          if (options.selection) return { data: { kind: "selection", data: state.selection } };
          const s = client.getQueryState(cartKey); return { data: s.data, isError: s.status === "error", isFetching: s.fetchStatus === "fetching", refetch: () => client.fetchQuery(options) };
        }, useMutation: options => { const observer = slot(() => new MutationObserver(client, options)); observer.setOptions(options);
          return { ...observer.getCurrentResult(), mutate: input => { void observer.mutate(input).catch(() => {}); } }; } };
      if (name === "@/features/products/api/quick-add-selection.client") return { quickAddSelectionQueryOptions: () => ({ selection: true, queryKey: ["selection"] }) };
      if (name === "@/features/cart/actions/add-cart-line") return { addCartLine: async input => {
        state.calls.push(input); if (state.deferred) await state.deferred;
        if (state.failure instanceof Error) throw state.failure;
        return state.failure ?? { ok: true, cart: { lines: [{ id: "new", product: { id: "1" }, variant: { id: input.variantId }, quantity: input.quantity, personalization: input.personalization ?? null }], gift: { isGift: false } } };
      } };
      if (name === "@/features/cart/api/cart-recommendation-lifecycle") return { beginRecommendationTransition: () => ({ ready: Promise.resolve(), finish() {} }) };
      if (name === "@/features/cart/api/cart-recommendations-query") return { invalidateCartRecommendations: async () => {} };
      if (name === "@/features/location/components/browsing-city-provider") return { useBrowsingCity: () => ({ committedCity: state.city === null ? null : { id: state.city }, isChanging: false }) };
      if (name === "@/lib/rafal-toast") return { useRafalToast: () => ({ success() {} }) };
      if (name === "@/i18n/navigation") return { Link: "a" };
      if (locale && name === "@/components/ui/field") return load("src/components/ui/field");
      if (name.startsWith("@/components/ui/")) return new Proxy({}, { get: () => "button" });
      if (name.startsWith("@/")) return load(`src/${name.slice(2)}`);
      return require(name);
    };
    const fetch = async () => { state.reads++; if (state.readFails) throw new Error("offline"); return { ok: true, json: async () => ({ lines: [], gift: { isGift: false } }) }; };
    vm.runInThisContext(`(function(require,module,exports,fetch){${code}\n})`, { filename: file })(localRequire, loaded, loaded.exports, fetch);
    return loaded.exports;
  }
  const Sheet = load("src/features/products/components/product-card/product-quick-add-sheet").ProductQuickAddSheet;
  const Fields = load("src/features/products/components/product-personalization-fields").ProductPersonalizationFields;
  const render = () => { cursor = 0; const tree = Sheet({ cityId: state.city, locale: "en", slug: "product", productName: "Product", returnFocusRef: { current: null }, onOpenChange: open => { state.closed = !open; } });
    return { tree, add: find(tree, e => e.props["data-quick-add-action"] === "add"), fields: find(tree, e => e.type === Fields) }; };
  return { client, state, render, load };
}
function find(node, predicate) {
  if (!React.isValidElement(node)) return null;
  if (predicate(node)) return node;
  return React.Children.toArray(node.props.children).map(child => find(child, predicate)).find(Boolean);
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test("required text, API language subset and maximum length; arbitrary characters pass through unchanged", async () => {
  const h = harness(); let view = h.render(); assert.equal(view.add.props.disabled, true);
  for (const text of ["", "  ", "x".repeat(21)]) { view.fields.props.onChangeText(text); view = h.render(); assert.equal(view.add.props.disabled, true); }
  const text = "  هدية 123! 🙂  "; view.fields.props.onChangeText(text); view = h.render();
  assert.equal(view.add.props.disabled, false);
  view.fields.props.onSelectLanguage("arabic"); assert.equal(h.render().add.props.disabled, true);
  h.render().fields.props.onSelectLanguage("english"); view = h.render(); view.add.props.onClick(); view.add.props.onClick(); await tick();
  assert.equal(h.state.calls.length, 1); assert.deepEqual(h.state.calls[0].personalization, { language: "english", text });
  assert.equal(h.client.getQueryData(cartKey).lines[0].quantity, 1); assert.equal(h.state.closed, true);
});

test("non-personalized selection omits all personalization UI and payload", async () => {
  const h = harness({ enabled: false }); const view = h.render(); assert.equal(view.fields, undefined);
  view.add.props.onClick(); await tick(); assert.equal("personalization" in h.state.calls[0], false);
});

test("backend rejection preserves text, language and selected options without closing", async () => {
  const h = harness(config, [option("17", { size: "S" }), option("18", { size: "M" })]);
  h.state.selection.product.options = [{ id: "size", key: "size", values: [{ id: "S", label: "S" }, { id: "M", label: "M" }] }];
  let view = h.render(); view.fields.props.onChangeText("123!");
  find(view.tree, e => e.type === "input" && e.props.value === "M").props.onChange();
  h.state.failure = { ok: false, error: { code: "invalid-personalization" } };
  view = h.render(); view.add.props.onClick(); await tick(); view = h.render();
  assert.equal(view.fields.props.personalizationInput.text, "123!");
  assert.equal(find(view.tree, e => e.type === "input" && e.props.value === "M").props.checked, true);
  assert.equal(h.state.calls[0].variantId, "18"); assert.equal(h.state.closed, false); assert.equal(h.state.calls.length, 1);
});

test("ambiguous variants and changed city cannot submit", () => {
  for (const ambiguous of [true, false]) {
    const h = harness(config, ambiguous ? [option("17"), option("18")] : [option("17")]);
    h.render().fields.props.onChangeText("Name"); if (!ambiguous) h.state.city = 2;
    const view = h.render(); assert.equal(view.add.props.disabled, true); view.add.props.onClick(); assert.equal(h.state.calls.length, 0);
  }
});

test("latest canonical quantities and global mutation coordination protect absolute Add intent", async () => {
  const h = harness(); h.render().fields.props.onChangeText("Name"); const view = h.render();
  h.client.setQueryData(cartKey, { lines: [{ variant: { id: "17" }, quantity: 5 }] }); view.add.props.onClick(); assert.equal(h.state.calls.length, 0);
  h.client.setQueryData(cartKey, { lines: [] }); let release;
  const other = new MutationObserver(h.client, { mutationKey: ["cart", "mutation"], scope: { id: "cart" }, mutationFn: () => new Promise(r => { release = r; }) });
  const pending = other.mutate(); await tick(); view.add.props.onClick(); assert.equal(h.state.calls.length, 0); release(); await pending;
});

test("uncertain Add reconciles reads only and failed reconciliation blocks another Add", async () => {
  const h = harness(); h.render().fields.props.onChangeText("Name"); h.state.failure = new Error("uncertain"); h.state.readFails = true;
  h.render().add.props.onClick(); await tick(); await tick(); const view = h.render();
  assert.equal(h.state.calls.length, 1); assert.equal(h.state.reads, 1); assert.equal(view.add.props.disabled, true);
  assert.equal(view.fields.props.personalizationInput.text, "Name"); view.add.props.onClick(); assert.equal(h.state.calls.length, 1);
});

test("returned uncertain Server Action failures reconcile and lock Add if the read fails", async () => {
  for (const code of ["service-unavailable", "cart-session-failure"]) {
    const h = harness(); h.render().fields.props.onChangeText("Name");
    h.state.failure = { ok: false, error: { code } }; h.state.readFails = true;
    h.render().add.props.onClick(); await tick(); await tick();
    assert.equal(h.state.reads, 1); assert.equal(h.state.calls.length, 1);
    const view = h.render(); assert.equal(view.add.props.disabled, true);
    view.add.props.onClick(); assert.equal(h.state.calls.length, 1);
    assert.equal(view.fields.props.personalizationInput.text, "Name");
    const retry = find(view.tree, e => e.props.children === "sheet.retry");
    assert.ok(retry); h.state.readFails = false; retry.props.onClick(); await tick();
    assert.equal(h.state.reads, 2); assert.equal(h.state.calls.length, 1);
    assert.equal(h.render().add.props.disabled, false);
  }
});

test("a retained Add handler cannot submit after a same-tick variant change", () => {
  const h = harness(config, [option("17", { size: "S" }), option("18", { size: "M" })]);
  h.state.selection.product.options = [{ id: "size", key: "size", values: [{ id: "S", label: "S" }, { id: "M", label: "M" }] }];
  let view = h.render(); view.fields.props.onChangeText("Name");
  find(view.tree, e => e.type === "input" && e.props.value === "S").props.onChange();
  view = h.render(); assert.equal(view.add.props.disabled, false);
  find(view.tree, e => e.type === "input" && e.props.value === "M").props.onChange();
  view.add.props.onClick(); assert.equal(h.client.isMutating(), 0);
});

test("a retained Add handler cannot submit after the committed city changes", () => {
  const h = harness(); h.render().fields.props.onChangeText("Name"); const old = h.render();
  h.state.city = 2; h.render(); old.add.props.onClick(); assert.equal(h.client.isMutating(), 0);
});

test("no city shows a recoverable location message without exposing Add", () => {
  const h = harness(); h.state.city = null; const view = h.render();
  assert.equal(view.add, undefined); assert.ok(find(view.tree, e => e.props.children === "errors.locationRequired"));
});

test("real parser, mapper and modal projection preserve API language codes without fallback", () => {
  const h = harness();
  const parse = h.load("src/features/products/api/parse-product-dto").parseProductDto;
  const map = h.load("src/features/products/api/product-mappers").mapProductDtoToProductDetails;
  const project = h.load("src/features/products/utils/quick-add-selection").projectQuickAddSelectionData;
  for (const [languages, expected] of [[["ar", "en"], ["arabic", "english"]], [["en"], ["english"]], [["fr", "ar"], ["arabic"]], [undefined, []], [null, []], [[], []], [["arabic", "english"], []]]) {
    const raw = JSON.parse(readFileSync("tests/fixtures/product-33.json", "utf8")).data;
    Object.assign(raw, { is_personalizable: true, personalization_max_length: 15, personalization_languages: languages });
    const data = project(map(parse(raw)), { id: 1, name: "City" }, {});
    assert.deepEqual(data.product.personalization.allowedLanguages, expected);
    assert.equal(data.product.personalization.maxLength, 15);
    assert.equal("warehouseStocks" in data.product.variants[0], false);
    const modal = harness(data.product.personalization); assert.equal(modal.render().add.props.disabled, true);
  }
});

test("shared PDP/modal fields render localized required inputs with distinct IDs and language direction", () => {
  for (const locale of ["ar", "en"]) {
    const h = harness(config, undefined, locale);
    const Fields = h.load("src/features/products/components/product-personalization-fields").ProductPersonalizationFields;
    const props = { locale, product: { personalization: { ...config, allowedLanguages: ["arabic", "english"] } },
      personalizationInput: { language: locale === "ar" ? "arabic" : "english", text: "123!" },
      personalizationValidation: { valid: true }, onChangeText() {}, onSelectLanguage() {} };
    const html = renderToStaticMarkup(React.createElement("div", { dir: locale === "ar" ? "rtl" : "ltr" }, React.createElement(Fields, props), React.createElement(Fields, props)));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length);
    for (const [, reference] of html.matchAll(/(?:for|aria-labelledby)="([^"]+)"/g)) assert.ok(ids.includes(reference));
    assert.match(html, /required=""/); assert.match(html, /maxLength="20"/i);
    assert.match(html, new RegExp(`dir="${locale === "ar" ? "rtl" : "ltr"}"`));
    assert.match(html, locale === "ar" ? /لكل قطعة/ : /per unit/);
    assert.doesNotMatch(html, /Letters and spaces only/);
    const unavailable = renderToStaticMarkup(React.createElement(Fields, { ...props, product: { personalization: { ...config, allowedLanguages: [] } }, personalizationInput: null, personalizationValidation: null }));
    assert.match(unavailable, /role="status"/);
    assert.doesNotMatch(unavailable, /<input/);
  }
});
