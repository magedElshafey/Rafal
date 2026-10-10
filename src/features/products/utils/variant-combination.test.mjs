import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  findAmbiguousVariantCombinations,
  resolveUniqueVariantByAttributes,
} from "./variant-combination.ts";

test("duplicate variant combinations are detected independent of attribute order", () => {
  const variants = [
    { id: "first", attributes: { color: "red", size: "large" } },
    { id: "second", attributes: { size: "large", color: "red" } },
    { id: "third", attributes: { color: "blue", size: "large" } },
  ];
  assert.deepEqual(findAmbiguousVariantCombinations(variants), [
    {
      attributes: [["color", "red"], ["size", "large"]],
      variantIds: ["first", "second"],
    },
  ]);
});

test("valid distinct combinations have no ambiguity", () => {
  assert.deepEqual(
    findAmbiguousVariantCombinations([
      { id: "first", attributes: { color: "red" } },
      { id: "second", attributes: { color: "blue" } },
    ]),
    [],
  );
});

test("variant resolution never chooses arbitrarily from duplicate matches", () => {
  const duplicates = [
    { id: "first", attributes: { color: "red" } },
    { id: "second", attributes: { color: "red" } },
  ];
  assert.equal(resolveUniqueVariantByAttributes(duplicates, { color: "red" }), null);
  assert.equal(
    resolveUniqueVariantByAttributes(
      [...duplicates, { id: "blue", attributes: { color: "blue" } }],
      { color: "blue" },
    )?.id,
    "blue",
  );
});

test("semantic validation owns ambiguity and the mapper has no logging side effect", async () => {
  const [validator, mapper] = await Promise.all([
    readFile(new URL("./assert-product-configuration.ts", import.meta.url), "utf8"),
    readFile(new URL("../api/product-mappers.ts", import.meta.url), "utf8"),
  ]);
  assert.match(validator, /ProductConfigurationError/);
  assert.match(validator, /findAmbiguousVariantCombinations/);
  assert.doesNotMatch(mapper, /console\.error|reportAmbiguousVariantCombinations/);
});

test("Quick Add maps configuration ambiguity to a safe code without diagnostics", async () => {
  const boundary = await readFile(
    new URL("../server/quick-add-selection-boundary.ts", import.meta.url),
    "utf8",
  );
  assert.match(boundary, /product-configuration-invalid/);
  assert.doesNotMatch(boundary, /error\.diagnostic/);
});
