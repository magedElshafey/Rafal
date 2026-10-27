import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import path from "node:path";
import React from "react";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const cities = [{ id: 1, name: "Riyadh", regionId: 10 }];
const address = { id: "1", label: "Home", recipientName: "Test", recipientPhone: "+966501234567", city: { ...cities[0], region: { id: 10, name: "Region" } }, district: "Saved", streetDetails: "Street", isDefault: false };
const common = JSON.parse(readFileSync("src/messages/en/common.json", "utf8"));
const account = JSON.parse(readFileSync("src/messages/en/account.json", "utf8"));

function harness() {
  const modules = new Map(), states = new Map(), mutations = [], commits = [];
  let state, cursor;
  const marker = () => null;
  const MapPicker = () => null;
  function load(relative) {
    const base = path.join(root, relative);
    const file = [base + ".ts", base + ".tsx"].find(existsSync);
    if (modules.has(file)) return modules.get(file).exports;
    const loadedModule = { exports: {} }; modules.set(file, loadedModule);
    vm.runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      module: loadedModule, exports: loadedModule.exports,
      require: name => {
        if (name === "react") return { ...React, useId: () => "test-id", useState: initial => {
          const index = cursor++, current = state;
          if (!(index in current)) current[index] = typeof initial === "function" ? initial() : initial;
          return [current[index], next => { current[index] = typeof next === "function" ? next(current[index]) : next; }];
        } };
        if (name === "@tanstack/react-query") return { useQuery: () => ({ data: cities, isPending: false }), useQueryClient: () => ({}), queryOptions: value => value,
          useMutation: () => ({ mutate: input => mutations.push(input), isPending: false }) };
        if (name === "@/features/addresses/components/address-map-picker") return { AddressMapPicker: MapPicker };
        if (name.startsWith("@/components/")) return new Proxy({}, { get: () => marker });
        if (name === "@/i18n/navigation") return { useRouter: () => ({ refresh() {} }) };
        if (name === "@/lib/rafal-toast") return { useRafalToast: () => ({ success() {} }) };
        if (name.includes("/actions/") || name.includes("address-query") || name.includes("city-query") || name.includes("checkout-gift-recipient-editor")) return new Proxy({}, { get: () => () => ({}) });
        if (name === "@/lib/utils") return { cn: () => "" };
        if (name.startsWith("@/")) return load("src/" + name.slice(2));
        return require(name);
      },
    });
    return loadedModule.exports;
  }
  function render(key, component, props) { state = states.get(key) ?? []; states.set(key, state); cursor = 0; return component(props); }
  function find(tree, predicate) {
    if (!tree || typeof tree !== "object") return null;
    if (predicate(tree)) return tree;
    for (const child of React.Children.toArray(tree.props?.children)) { const result = find(child, predicate); if (result) return result; }
    return null;
  }
  return { load, render, find, mutations, commits, MapPicker };
}
const plain = value => JSON.parse(JSON.stringify(value));

for (const edit of [false, true]) {
  test(`Address Book ${edit ? "edit" : "add"}: actual form merges safely and preserves exact save input`, () => {
    const h = harness();
    const { AddressForm } = h.load("src/features/addresses/components/address-form");
    const props = { address: edit ? address : null, copy: account.addresses.form, locale: "en", onClose() {}, open: true, returnFocusRef: { current: null } };
    const render = () => h.render("address", AddressForm, props);
    const field = name => h.find(render(), el => el.props.name === name);
    if (!edit) {
      for (const [name, value] of [["addressLabel", "Home"], ["recipientName", "Test"], ["recipientPhone", "501234567"], ["cityId", "1"]]) field(name).props.onChange({ target: { value } });
    }
    const suggestions = { district: "Map District", streetDetails: "Map Street", city: "Unsupported", lat: 12 };
    h.find(render(), el => el.type === h.MapPicker).props.onSuggestion(suggestions, false);
    assert.equal(field("district").props.value, edit ? "Saved" : "Map District");
    field("district").props.onChange({ target: { value: "" } });
    h.find(render(), el => el.type === h.MapPicker).props.onSuggestion(suggestions, false);
    assert.equal(field("district").props.value, "");
    h.find(render(), el => el.type === h.MapPicker).props.onSuggestion(suggestions, true);
    h.find(render(), el => el.type === "form").props.onSubmit({ preventDefault() {} });
    assert.deepEqual(plain(h.mutations[0]), edit ? { district: "Map District", streetDetails: "Map Street" } : {
      label: "Home", recipientName: "Test", recipientPhone: "+966501234567", cityId: 1, district: "Map District", streetDetails: "Map Street", isDefault: false,
    });
  });
}

for (const authenticated of [false, true]) {
  test(`${authenticated ? "User" : "Guest"} Checkout actual one-time form preserves manual commit and city ID`, () => {
    const h = harness();
    const { CheckoutDestinationSection } = h.load("src/features/checkout/components/checkout-destination-section");
    const section = h.render("section", CheckoutDestinationSection, { addresses: [], addressesUnavailable: false, committedDestination: null, copy: common.checkoutPage.destination,
      gift: null, isAuthenticated: authenticated, locale: "en", onCommit: value => h.commits.push(value) });
    const form = h.find(section, el => el.type?.name === "OneTimeAddressForm");
    const render = () => h.render("one-time", form.type, { ...form.props, committedAddress: h.commits.at(-1)?.address ?? null });
    const field = name => h.find(render(), el => el.props.name === name);
    for (const [name, value] of [["recipientName", "Test"], ["recipientPhone", "501234567"], ["cityId", "1"], ["district", "Manual"], ["streetDetails", "Street"]]) field(name).props.onChange({ target: { value } });
    // Manual submission does not require the picker to run or have credentials.
    h.find(render(), el => el.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(h.commits.length, 1, "an uncommitted alternative must not deselect a saved address");
    assert.deepEqual(plain(h.commits[0]), { kind: "one-time-address", address: { recipientName: "Test", recipientPhone: "+966501234567", cityId: 1, district: "Manual", streetDetails: "Street" } });
    h.find(render(), el => el.type === h.MapPicker).props.onSuggestion({ district: "Late", streetDetails: "Late", city: "Other" }, false);
    assert.equal(field("district").props.value, "Manual");
    assert.equal(field("cityId").props.value, "1");
    assert.equal(h.commits.length, 1, "ignored suggestions must not invalidate a committed address");
    h.find(render(), el => el.type === h.MapPicker).props.onCityChange({ id: 2, name: "Other city" });
    assert.equal(h.commits.at(-1), null, "map city changes invalidate the committed destination");
    assert.equal(field("cityId").props.value, "2");
    h.find(render(), el => el.type === "form").props.onSubmit({ preventDefault() {} });
    h.find(render(), el => el.type === h.MapPicker).props.onSuggestion({ district: "New district", streetDetails: "New street" }, true);
    assert.equal(h.commits.length, 4);
    assert.equal(h.commits.at(-1), null, "applied map details invalidate the committed destination");
    assert.equal(field("district").props.value, "New district");
  });
}

for (const surface of ["Cart", "Checkout"]) {
  test(`${surface} gift shared fields preserve names, phone, city and deliberate clears`, () => {
    const h = harness();
    const { GiftRecipientFields } = h.load("src/features/cart/components/gift-recipient-fields");
    let draft = { name: "Recipient", phone: "501234567", city: cities[0], district: "", streetDetails: "" };
    const render = () => h.render("gift", GiftRecipientFields, { busy: false, copy: {}, draft, errors: {}, feedbackMessages: [], locale: "en", onChange: (key, value) => { draft = { ...draft, [key]: value }; } });
    h.find(render(), el => el.type === h.MapPicker).props.onSuggestion({ district: "Map", streetDetails: "Road", city: "Wrong", phone: "Wrong" }, false);
    assert.deepEqual(draft, { name: "Recipient", phone: "501234567", city: cities[0], district: "Map", streetDetails: "Road" });
    h.find(render(), el => el.props.name === "district").props.onChange({ target: { value: "" } });
    h.find(render(), el => el.type === h.MapPicker).props.onSuggestion({ district: "Late" }, false);
    assert.equal(draft.district, "");
    const caller = readFileSync(surface === "Cart" ? "src/features/cart/components/cart-gift.tsx" : "src/features/checkout/components/checkout-gift-recipient-editor.tsx", "utf8");
    assert.match(caller, /<GiftRecipientFields/);
  });
}
