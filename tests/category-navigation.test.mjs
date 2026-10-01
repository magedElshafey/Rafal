import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/features/categories/utils/category-navigation.ts", import.meta.url), "utf8");
const loadedModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: loadedModule.exports, module: loadedModule, URLSearchParams });
const { mapCategoryNavigation } = loadedModule.exports;
const project = (categories) => JSON.parse(JSON.stringify(mapCategoryNavigation(categories)));

function category(id, slug, children = []) {
  return { id, slug, name: `Category ${id}`, imageUrl: "/unused.png", description: "Not navigation data", sortOrder: id, children };
}

test("leaf categories stay direct links with no invented hierarchy", () => {
  assert.deepEqual(project([category(1, "gifts")]), [{
    id: 1, name: "Category 1", href: "/categories/gifts", children: [],
  }]);
});

test("children use the existing parent route and subcategory filter contract", () => {
  const [parent] = project([category(1, "jewelry", [category(2, "rings")])]);
  assert.equal(parent.href, "/categories/jewelry");
  assert.deepEqual(parent.children, [{ id: 2, name: "Category 2", href: "/categories/jewelry?subcategory=rings" }]);
});

test("Arabic and reserved characters are encoded independently in path and query", () => {
  const slug = "هدايا خاصة";
  const childSlug = "أسماء & خرز/مميز";
  const [parent] = project([category(1, slug, [category(2, childSlug)])]);
  assert.equal(decodeURIComponent(parent.href.slice("/categories/".length)), slug);
  const childUrl = new URL(parent.children[0].href, "https://example.test");
  assert.equal(childUrl.searchParams.get("subcategory"), childSlug);
  assert.equal(childUrl.searchParams.size, 1);
});

test("API ordering is retained and source objects are not mutated", () => {
  const input = [category(3, "three", [category(9, "nine"), category(2, "two")]), category(1, "one")];
  const before = JSON.stringify(input);
  const result = project(input);
  assert.deepEqual(result.map((entry) => entry.id), [3, 1]);
  assert.deepEqual(result[0].children.map((entry) => entry.id), [9, 2]);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(Object.keys(result[0]), ["id", "name", "href", "children"]);
});

test("an empty first page remains a valid directory-link fallback", () => {
  assert.deepEqual(project([]), []);
});
