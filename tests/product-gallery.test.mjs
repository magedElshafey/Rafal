import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);

// Exercise actual TS/TSX, Next Image and Radix SSR without a Next server/env.
function loadSource(relativePath, overrides = {}, globals = {}) {
  const base = path.join(root, relativePath);
  const filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const loadedModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: loadedModule,
    exports: loadedModule.exports,
    require: (specifier) => {
      if (specifier in overrides) return overrides[specifier];
      if (specifier.startsWith("@phosphor-icons/react")) {
        return new Proxy({}, { get: () => (props) => React.createElement("svg", props) });
      }
      // Icons are irrelevant to the media/lifecycle assertions below.
      if (specifier === "@/components/ui/icons") {
        return Object.fromEntries(["ChevronLeftIcon", "ChevronRightIcon", "EyeIcon", "ImageIcon", "XIcon"].map(
          (name) => [name, (props) => React.createElement("svg", props)],
        ));
      }
      return specifier.startsWith("@/")
        ? loadSource(`src/${specifier.slice(2)}`, overrides, globals)
        : require(specifier);
    },
    ...globals,
  }, { filename });
  return loadedModule.exports;
}

const { resolveGalleryImageId, getRelativeGalleryIndex, getGalleryArrowOffset } =
  loadSource("src/features/products/utils/product-gallery");
const { mapProductDtoToProductDetails } = loadSource("src/features/products/api/product-mappers");
const { ProductGallery } = loadSource("src/features/products/components/product-details/product-gallery");
const images = ["a", "b", "c"].map((id) => ({ id, src: `/images/${id}.jpg`, alt: "Product" }));
const props = {
  copy: {
    closeLightbox: "Close", imagePositionTemplate: "{current} of {total}",
    lightboxTitleTemplate: "View {image}", nextImage: "Next", openImageTemplate: "Open {image}",
    previousImage: "Previous", selectImageTemplate: "Select {image}",
  },
  direction: "ltr", images, initialImageId: "b", selectedImageId: "b",
  productName: "Product", onSelectImage() {},
};

function mappedMedia(productImages, variantImages) {
  return mapProductDtoToProductDetails({
    id: 1, name: "Product", category: { id: 1, name: "Gifts", slug: "gifts" },
    images: productImages, is_personalizable: false,
    variants: variantImages.map((media, index) => ({
      id: index, attributes: { color: String(index) }, images: media,
      effective_price_incl_vat: "100", discounted_price_incl_vat: null, warehouse_stocks: [],
    })),
  });
}

test("PDP mapping deduplicates URLs and IDs in backend order, including variant aliases", () => {
  const result = mappedMedia(
    [{ id: 1, url: "a" }, { id: 2, url: "a" }, { id: 3, url: "b" }],
    [[{ id: 4, url: "a" }, { id: 5, url: "c" }, { id: 4, url: "d" }], [{ id: 6, url: "c" }]],
  );
  assert.deepEqual(Array.from(result.images, ({ id, src }) => [id, src]), [["1", "a"], ["3", "b"], ["5", "c"]]);
  assert.deepEqual(Array.from(result.variants, (variant) => Array.from(variant.imageIds)), [["1", "5"], ["5"]]);
  assert.ok(result.images.every((image) => image.alt === "Product"));
});

test("exact URL identity preserves different query variants and first repeated ID", () => {
  const result = mappedMedia([{ id: 1, url: "a?q=1" }, { id: 1, url: "b" }], [[{ id: 2, url: "a?q=2" }]]);
  assert.deepEqual(Array.from(result.images, (image) => image.src), ["a?q=1", "a?q=2"]);
});

test("empty product media falls back to ordered variant media, including no media", () => {
  assert.deepEqual(Array.from(mappedMedia([], [[], [{ id: 7, url: "v" }]]).images, (image) => image.id), ["7"]);
  assert.equal(mappedMedia([], [[]]).images.length, 0);
});

test("selection survives reordering, then falls back to a valid variant, first image, or null", () => {
  assert.equal(resolveGalleryImageId([images[2], images[1]], "b", ["c"]), "b");
  assert.equal(resolveGalleryImageId(images, "removed", ["missing", "c"]), "c");
  assert.equal(resolveGalleryImageId(images, "removed", ["missing"]), "a");
  assert.equal(resolveGalleryImageId([], "b", ["c"]), null);
});

test("navigation wraps both ways for 0/1/many and mirrors visual arrows without reversing data", () => {
  for (const count of [0, 1, 2, 100]) {
    assert.equal(getRelativeGalleryIndex(0, -1, count), count - 1);
    assert.equal(getRelativeGalleryIndex(count - 1, 1, count), count ? 0 : -1);
  }
  assert.equal(getGalleryArrowOffset("ArrowRight", "ltr"), 1);
  assert.equal(getGalleryArrowOffset("ArrowLeft", "ltr"), -1);
  assert.equal(getGalleryArrowOffset("ArrowRight", "rtl"), -1);
  assert.equal(getGalleryArrowOffset("ArrowLeft", "rtl"), 1);
  assert.equal(getGalleryArrowOffset("ArrowDown", "rtl"), 0);
});

for (const count of [0, 1, 3]) {
  test(`SSR ${count} images: only primary and lazy thumbnails, no closed portal image`, () => {
    const html = renderToStaticMarkup(React.createElement(ProductGallery, { ...props, images: images.slice(0, count) }));
    const imageTags = html.match(/<img\b[^>]*>/g) ?? [];
    assert.equal(imageTags.length, count > 1 ? count + 1 : count);
    const preloads = html.match(/<link\b[^>]*rel="preload"[^>]*>/g) ?? [];
    assert.equal(preloads.length, count ? 1 : 0);
    assert.equal(imageTags.filter((tag) => tag.includes('loading="lazy"')).length, count > 1 ? count : 0);
    assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, count > 1 ? 1 : 0);
    assert.equal(html.includes('role="dialog"'), false);
    assert.equal(html.includes('aria-label="Next"'), count > 1);
    if (count > 1) {
      assert.ok(imageTags[0].includes("b.jpg"));
      assert.ok(imageTags.slice(1).every((tag) => tag.includes('alt=""')));
      assert.ok(html.includes("Select Product — 3 of 3"));
    }
  });
}

test("SSR stale selection uses a valid primary instead of throwing or rendering an invalid image", () => {
  const html = renderToStaticMarkup(React.createElement(ProductGallery, { ...props, selectedImageId: "removed" }));
  assert.match(html.match(/<img\b[^>]*>/)[0], /b.jpg/);
});

// A bounded hook/element harness exercises owner callbacks, not browser layout
// or Radix internals. Real SSR above separately checks the mounted image policy.
function galleryHarness() {
  const slots = [];
  let cursor = 0;
  let changed = false;
  let currentProps = { ...props };
  let tree;
  class Element {
    constructor({ control = true, portal = false, thumbnail = false } = {}) {
      Object.assign(this, { control, portal, thumbnail });
    }
    closest(selector) {
      return (selector === '[role="dialog"]' ? this.portal :
        selector === "button" ? this.portal : this.control) ? this : null;
    }
    hasAttribute() { return this.thumbnail; }
  }
  const hooks = {
    ...React,
    useRef(value) { return slots[cursor++] ??= { current: value }; },
    useEffect() {},
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], (value) => {
        slots[index] = typeof value === "function" ? value(slots[index]) : value;
        changed = true;
      }];
    },
  };
  const { ProductGallery: Gallery } = loadSource(
    "src/features/products/components/product-details/product-gallery",
    { react: hooks }, { HTMLElement: Element },
  );
  const render = (patch = {}) => {
    currentProps = { ...currentProps, ...patch };
    for (let attempt = 0; attempt < 10; attempt++) {
      cursor = 0;
      changed = false;
      tree = Gallery(currentProps);
      if (!changed) return tree;
    }
    assert.fail("Gallery state did not settle");
  };
  const all = (node = tree) => React.isValidElement(node)
    ? [node, ...React.Children.toArray(node.props.children).flatMap((child) => all(child))] : [];
  render();
  return {
    render,
    find: (predicate) => all().find(predicate),
    key(key, options = {}) {
      let prevented = false;
      tree.props.onKeyDown({
        key, target: new Element(options), currentTarget: { contains: () => !options.portal && !options.outside },
        preventDefault() { prevented = true; }, stopPropagation() {}, ...options.modifiers,
      });
      return prevented;
    },
  };
}

test("arrows are scoped, ignore modifiers/other controls, and use RTL sequence semantics", () => {
  const harness = galleryHarness();
  const selections = [];
  harness.render({ onSelectImage: (id) => selections.push(id) });
  assert.equal(harness.key("ArrowRight", { outside: true }), false);
  assert.equal(harness.key("ArrowRight", { control: false }), false);
  assert.equal(harness.key("ArrowRight", { modifiers: { ctrlKey: true } }), false);
  assert.equal(harness.key("ArrowDown"), false);
  assert.equal(harness.key("ArrowRight"), true);
  harness.render({ direction: "rtl" });
  assert.equal(harness.key("ArrowRight"), true);
  assert.deepEqual(selections, ["c", "a"]);
});

test("lightbox arrows work from portalled Close and restore the persistent opener or empty fallback", () => {
  const harness = galleryHarness();
  const selections = [];
  harness.render({ onSelectImage: (id) => selections.push(id) });
  const opener = harness.find((node) => node.props["aria-haspopup"] === "dialog");
  opener.props.onClick();
  harness.render();
  let modal = harness.find((node) => "returnFocusRef" in node.props);
  assert.equal(modal.props.open, true);
  assert.equal(modal.props.returnFocusRef, opener.props.ref);
  assert.equal(harness.key("ArrowRight", { portal: true, control: false }), true);
  assert.deepEqual(selections, ["c"]);
  harness.render({ selectedImageId: "c", initialImageId: "c" });
  assert.equal(harness.find((node) => "preload" in node.props).props.preload, false);
  assert.equal(harness.find((node) => "returnFocusRef" in node.props).props.returnFocusRef, opener.props.ref);
  const empty = harness.render({ images: [] });
  modal = harness.find((node) => "returnFocusRef" in node.props);
  assert.equal(modal.props.open, false);
  assert.equal(modal.props.returnFocusRef, empty.props.ref);
  harness.render({ images });
  assert.equal(harness.find((node) => "returnFocusRef" in node.props).props.open, false);
});
