import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(relative, overrides = {}) {
  const base = new URL(`../${relative}`, import.meta.url);
  const file = [base, new URL(`${base}.ts`), new URL(`${base}.tsx`)].find(existsSync);
  const loadedModule = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  vm.runInNewContext(outputText, {
    module: loadedModule, exports: loadedModule.exports,
    require: (id) => id in overrides ? overrides[id] : id.startsWith("@/")
      ? load(`src/${id.slice(2)}`, overrides) : require(id),
  });
  return loadedModule.exports;
}

test("location retains label/city reading order and native activation in both directions", () => {
  const { LocationSelector } = load("src/components/shared/LocationSelector", {
    "@/components/ui/icons": { ChevronDownIcon: () => null, MapPinIcon: () => null },
  });
  for (const [dir, deliveryLabel, city] of [["rtl", "التوصيل إلى", "مكة المكرمة"], ["ltr", "Deliver to", "Makkah"]]) {
    let activated = false;
    const element = LocationSelector({ dir, deliveryLabel, city, accessibilityLabel: "Change location", onClick: () => { activated = true; } });
    const html = renderToStaticMarkup(element);
    assert.match(html, /<button type="button" aria-label="Change location"/);
    assert.ok(html.indexOf(deliveryLabel) < html.indexOf(city));
    assert.match(html, /<bdi[^>]*>/);
    assert.doesNotMatch(html, /flex-row-reverse/);
    element.props.onClick();
    assert.equal(activated, true);
  }
});

test("carousel controls preserve direction, actions and disabled state", () => {
  for (const direction of ["rtl", "ltr"]) {
    const calls = [];
    const context = { direction, canScrollPrevious: false, canScrollNext: true,
      scrollPrevious: () => calls.push("previous"), scrollNext: () => calls.push("next") };
    const icons = { ChevronLeftIcon() {}, ChevronRightIcon() {} };
    const { AppCarouselPrevious, AppCarouselNext } = load("src/components/ui/app-carousel", {
      react: { ...React, useContext: () => context }, "@/components/ui/icons": icons,
    });
    const previous = AppCarouselPrevious({ label: "Previous" });
    const next = AppCarouselNext({ label: "Next" });
    assert.equal(previous.props.disabled, true);
    assert.equal(next.props.disabled, false);
    assert.equal(previous.props.children.type, direction === "rtl" ? icons.ChevronRightIcon : icons.ChevronLeftIcon);
    assert.equal(next.props.children.type, direction === "rtl" ? icons.ChevronLeftIcon : icons.ChevronRightIcon);
    next.props.onClick();
    context.canScrollPrevious = true;
    AppCarouselPrevious({ label: "Previous" }).props.onClick();
    assert.deepEqual(calls, ["next", "previous"]);
    assert.equal(AppCarouselNext({ label: "Next", disabled: true }).props.disabled, true);
  }
});
