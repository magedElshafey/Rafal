import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));

// Exercise the actual TS modules without a Next runtime or an extra test package.
function loadSource(relativePath, globals = {}) {
  const filename = path.join(root, relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const loadedModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: loadedModule,
    exports: loadedModule.exports,
    require: (specifier) => {
      assert.ok(specifier.startsWith("@/"), "Only local mapper dependencies expected");
      return loadSource(`src/${specifier.slice(2)}.ts`, globals);
    },
    ...globals,
  }, { filename });
  return loadedModule.exports;
}

const { mapProductDtoToListingProduct } = loadSource(
  "src/features/products/api/product-mappers.ts",
);

function listingMedia(productUrls, variantUrls) {
  const images = (urls) => urls.map((url, id) => ({ id, url }));
  const product = mapProductDtoToListingProduct({
    id: 1,
    category: { id: 1, slug: "gifts" },
    images: images(productUrls),
    variants: variantUrls.map((urls) => ({
      images: images(urls),
      effective_price_incl_vat: "100",
      discounted_price_incl_vat: null,
      warehouse_stocks: [],
    })),
  });
  return [product.imageUrl, product.secondaryImageUrl];
}

for (const [name, products, variants, expected] of [
  ["product ordering wins over variants", ["a", "b", "c"], [["d"]], ["a", "b"]],
  ["duplicate URLs are skipped regardless of IDs", ["a", "a", "b"], [["c"]], ["a", "b"]],
  ["variant fallback preserves variant and image order", ["a"], [["a", "a"], ["b", "c"]], ["a", "b"]],
  ["primary falls back past empty variants", [], [[], ["a", "a", "b"], ["c"]], ["a", "b"]],
  ["all duplicate images leave no secondary", ["a", "a"], [["a"]], ["a", null]],
  ["single image leaves no secondary", ["a"], [[]], ["a", null]],
  ["no images yields nulls", [], [[]], [null, null]],
]) {
  test(name, () => assert.deepEqual(listingMedia(products, variants), expected));
}

function intentHarness({ fine = true, focused = false } = {}) {
  let now = 0;
  let nextTimer = 0;
  let requests = 0;
  let capable = fine;
  const timers = new Map();
  class Link extends EventTarget {
    hovered = false;
    focused = focused;
    matches(selector) {
      return selector === ":hover" ? this.hovered : this.focused;
    }
  }
  const link = new Link();
  const { observeProductImageIntent } = loadSource(
    "src/features/products/components/product-card/product-image-intent.ts",
    {
      window: { matchMedia: () => ({ matches: capable }) },
      setTimeout: (callback, delay) => {
        const id = ++nextTimer;
        timers.set(id, { callback, at: now + delay });
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
    },
  );
  const cleanup = observeProductImageIntent(link, () => requests++);
  return {
    link,
    cleanup,
    get requests() { return requests; },
    get timers() { return timers.size; },
    setFine(value) { capable = value; },
    emit(type, properties = {}) {
      if (type === "pointerenter") link.hovered = true;
      if (type === "pointerleave") link.hovered = false;
      link.dispatchEvent(Object.assign(new Event(type), {
        pointerType: "mouse", buttons: 0, ...properties,
      }));
    },
    advance(ms) {
      now += ms;
      for (const [id, timer] of timers) {
        if (timer.at <= now) {
          timers.delete(id);
          timer.callback();
        }
      }
    },
  };
}

test("mount is idle; accepted dwell requests only once", () => {
  const h = intentHarness();
  assert.equal(h.requests, 0);
  assert.equal(h.timers, 0);
  h.emit("pointerenter");
  h.advance(124);
  assert.equal(h.requests, 0);
  h.advance(1);
  assert.equal(h.requests, 1);
  h.emit("pointerleave");
  h.emit("pointerenter");
  h.advance(200);
  assert.equal(h.requests, 1);
  assert.equal(h.timers, 0);
});

for (const event of ["pointerleave", "pointerdown", "pointercancel", "blur"]) {
  test(`${event} cancels pending intent`, () => {
    const h = intentHarness();
    h.emit("pointerenter");
    h.advance(100);
    h.emit(event);
    h.advance(100);
    assert.equal(h.requests, 0);
    assert.equal(h.timers, 0);
  });
}

test("rapid pass followed by re-entry requires a fresh full dwell", () => {
  const h = intentHarness();
  h.emit("pointerenter");
  h.advance(100);
  h.emit("pointerleave");
  h.emit("pointerenter");
  h.advance(100);
  assert.equal(h.requests, 0);
  h.advance(25);
  assert.equal(h.requests, 1);
});

test("touch, coarse pointers and held-button drag do not start timers", () => {
  const coarse = intentHarness({ fine: false });
  coarse.emit("pointerenter");
  assert.equal(coarse.timers, 0);
  const fine = intentHarness();
  fine.emit("pointerenter", { pointerType: "touch" });
  fine.emit("pointerenter", { buttons: 1 });
  assert.equal(fine.timers, 0);
});

test("hover and input capability are rechecked at the threshold", () => {
  const lostHover = intentHarness();
  lostHover.emit("pointerenter");
  lostHover.link.hovered = false;
  lostHover.advance(125);
  assert.equal(lostHover.requests, 0);
  const changedInput = intentHarness();
  changedInput.emit("pointerenter");
  changedInput.setFine(false);
  changedInput.advance(125);
  assert.equal(changedInput.requests, 0);
});

test("visible keyboard focus loads immediately even with coarse pointer", () => {
  const h = intentHarness({ fine: false });
  h.emit("focus");
  assert.equal(h.requests, 0);
  h.link.focused = true;
  h.emit("focus");
  assert.equal(h.requests, 1);
  h.emit("focus");
  assert.equal(h.requests, 1);
});

test("pre-hydration visible focus is honored; sibling events are not observed", () => {
  assert.equal(intentHarness({ focused: true }).requests, 1);
  const h = intentHarness();
  const wishlist = new EventTarget();
  wishlist.dispatchEvent(new Event("pointerenter"));
  wishlist.dispatchEvent(new Event("focus"));
  h.advance(200);
  assert.equal(h.requests, 0);
});

test("cleanup cancels pending timers and removes listeners", () => {
  const h = intentHarness();
  h.emit("pointerenter");
  h.cleanup();
  h.advance(200);
  h.emit("pointerenter");
  h.link.focused = true;
  h.emit("focus");
  assert.equal(h.requests, 0);
  assert.equal(h.timers, 0);
});
