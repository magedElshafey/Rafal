import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const modules = new Map();
// Phosphor's require export is not Node-compatible; use its actual ESM export.
const spinner = await import("@phosphor-icons/react/dist/ssr/CircleNotch");

// Render the real TSX modules with installed React; no Next/env or DOM library.
function loadSource(relativePath) {
  const filename = path.join(root, relativePath);
  if (modules.has(filename)) return modules.get(filename).exports;
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
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
    module: loaded,
    exports: loaded.exports,
    require: (specifier) => {
      if (specifier === "@phosphor-icons/react/dist/ssr/CircleNotch") return spinner;
      if (!specifier.startsWith("@/")) return require(specifier);
      const base = `src/${specifier.slice(2)}`;
      const resolved = [base + ".tsx", base + ".ts", base + "/index.ts"]
        .find((candidate) => existsSync(path.join(root, candidate)));
      assert.ok(resolved, `Resolve ${specifier}`);
      return loadSource(resolved);
    },
  }, { filename });
  return loaded.exports;
}

const { Input, InputField } = loadSource("src/components/ui/input.tsx");
const { Textarea } = loadSource("src/components/ui/textarea.tsx");
const { NativeSelect } = loadSource("src/components/ui/native-select.tsx");
const { Field, FieldLabel, FieldDescription, FieldError } = loadSource("src/components/ui/field.tsx");
const { ListingSortControl } = loadSource("src/features/products/components/listing/listing-sort.tsx");
const render = (component, props, ...children) => renderToStaticMarkup(h(component, props, ...children));

test("InputField preserves label, ref, native props and message precedence", () => {
  const props = {
    id: "email", name: "email", label: "Email", type: "email", required: true,
    defaultValue: "example", helperText: "Help", error: "Invalid email",
    descriptionId: "email-feedback", autoComplete: "email",
  };
  const html = render(InputField, props);
  assert.match(html, /<label[^>]*for="email"/);
  assert.match(html, /<input[^>]*id="email"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="email-feedback"/);
  assert.match(html, /required=""/);
  assert.match(html, /autoComplete="email"/i);
  assert.match(html, /<p[^>]*id="email-feedback"[^>]*>Invalid email<\/p>/);
  assert.ok(!html.includes(">Help<"));
  assert.ok(!html.includes('role="alert"'));
  const ref = { current: null };
  const field = InputField.render(props, ref);
  const input = field.props.children.find((child) => child?.type === Input);
  assert.equal(input.props.ref, ref);
  assert.equal(Input.render(input.props, ref).props.ref, ref);
});

test("InputField helper/default IDs and no-message state remain compatible", () => {
  const html = render(InputField, { id: "name", label: "Name", helperText: "Help" });
  assert.match(html, /aria-describedby="name-description"/);
  assert.match(html, /id="name-description"/);
  assert.ok(!/\saria-invalid="/.test(html));
  const bare = render(InputField, { id: "name", label: "Name" });
  assert.ok(!bare.includes("aria-describedby="));
});

test("Field supports simultaneous helper, count and error without implicit announcements", () => {
  const html = render(Field, null,
    h(FieldLabel, { htmlFor: "message" }, "Message"),
    h(Input, { id: "message", invalid: true, "aria-describedby": "policy count error" }),
    h(FieldDescription, { id: "policy" }, "Policy"),
    h(FieldDescription, { id: "count" }, "Count"),
    h(FieldError, { id: "error" }, "Error"),
  );
  assert.match(html, /for="message"/);
  assert.match(html, /aria-describedby="policy count error"/);
  for (const id of ["policy", "count", "error"]) assert.ok(html.includes(`id="${id}"`));
  assert.ok(!html.includes('role="alert"'));
  assert.match(render(FieldError, { role: "alert" }, "Error"), /role="alert"/);
});

test("Input and Textarea retain native disabled, readOnly, invalid and descriptions", () => {
  for (const [Component, tag] of [[Input, "input"], [Textarea, "textarea"]]) {
    const readOnly = render(Component, { name: "notes", readOnly: true, defaultValue: "Copy me" });
    assert.match(readOnly, new RegExp(`<${tag}\\b`));
    assert.match(readOnly, /readOnly=""/i);
    assert.ok(!readOnly.includes('disabled=""'));
    assert.ok(!/\saria-invalid="/.test(readOnly));
    const disabled = render(Component, { disabled: true, invalid: true, "aria-describedby": "a b" });
    assert.match(disabled, /disabled=""/);
    assert.match(disabled, /aria-invalid="true"/);
    assert.match(disabled, /aria-describedby="a b"/);
    assert.match(render(Component, { "aria-invalid": true }), /aria-invalid="true"/);
    const ref = { current: null };
    const onChange = () => {};
    const control = Component.render({ onChange }, ref);
    assert.equal(control.props.ref, ref);
    assert.equal(control.props.onChange, onChange);
  }
  const textarea = render(Textarea, { rows: 5, maxLength: 120, defaultValue: "Line one\nLine two" });
  assert.match(textarea, /rows="5"/);
  assert.match(textarea, /maxLength="120"/i);
  assert.match(textarea, />Line one\nLine two<\/textarea>/);
});

test("NativeSelect preserves selection/options and exposes only one interactive control", () => {
  const html = render(NativeSelect, {
    name: "city", id: "city", required: true, disabled: true,
    invalid: true, defaultValue: "", dir: "rtl", "aria-describedby": "city-help city-error",
  }, h("option", { value: "", disabled: true }, "Choose"), h("option", { value: "1" }, "City"));
  assert.equal((html.match(/<select\b/g) ?? []).length, 1);
  assert.match(html, /<select[^>]*name="city"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="city-help city-error"/);
  assert.match(html, /required=""/);
  assert.match(html, /disabled=""/);
  assert.match(html, /<option value="" disabled="" selected="">Choose<\/option>/);
  assert.match(html, /appearance-none/);
  assert.match(html, /<svg[^>]*aria-hidden="true"/);
  assert.match(html, /<svg[^>]*focusable="false"/);
  assert.match(html, /<svg[^>]*pointer-events-none/);
  assert.ok(!/<button|role="combobox"|aria-expanded=/.test(html));
  const ref = { current: null };
  const onChange = () => {};
  const select = NativeSelect.render({ onChange, value: "1" }, ref).props.children[0];
  assert.equal(select.type, "select");
  assert.equal(select.props.ref, ref);
  assert.equal(select.props.onChange, onChange);
  assert.equal(select.props.value, "1");
});

test("NativeSelect leaves multi-row native selection available without a dropdown icon", () => {
  const html = render(NativeSelect, { multiple: true, size: 3, defaultValue: ["a"] }, h("option", { value: "a" }, "A"));
  assert.match(html, /multiple=""/);
  assert.match(html, /size="3"/);
  assert.ok(!html.includes("<svg"));
});

test("ListingSort keeps div-free label markup, native selection, values and callback", () => {
  let result;
  const tree = ListingSortControl({ label: "Sort", options: { newest: "Newest", price_asc: "Price" }, sort: "newest", onChange: (value) => { result = value; } });
  assert.equal(tree.type, "label");
  const select = tree.props.children.find((child) => child?.type === NativeSelect);
  const nativeSelect = NativeSelect.render(select.props, null).props.children[0];
  assert.equal(nativeSelect.type, "select");
  assert.equal(nativeSelect.props.value, "newest");
  nativeSelect.props.onChange({ target: { value: "price_asc" } });
  assert.equal(result, "price_asc");
  const html = renderToStaticMarkup(tree);
  const label = html.match(/^<label\b[^>]*>([\s\S]*)<\/label>$/);
  assert.ok(label, "ListingSort renders a wrapping label");
  assert.doesNotMatch(label[1], /<div\b/i);
  assert.equal((label[1].match(/<select\b/g) ?? []).length, 1);
  assert.match(html, /<option value="newest" selected="">Newest<\/option>/);
  assert.match(html, /<option value="price_asc">Price<\/option>/);
});

// The static Contact pilot is now a real public mutation. Its native field,
// textarea, submit and error regression coverage lives in contact-messages.test.mjs.

test("form foundation adds no client directive", () => {
  for (const name of ["field", "input", "textarea", "native-select", "form-control-styles"]) {
    const extension = name === "form-control-styles" ? "ts" : "tsx";
    const source = readFileSync(path.join(root, `src/components/ui/${name}.${extension}`), "utf8");
    const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.ok(!ast.statements.some((statement) => ts.isExpressionStatement(statement)
      && ts.isStringLiteral(statement.expression) && statement.expression.text === "use client"));
  }
});
