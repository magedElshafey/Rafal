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

test("multiple empty attribute combinations are ambiguous", () => {
  assert.deepEqual(
    findAmbiguousVariantCombinations([
      { id: "first", attributes: {} },
      { id: "second", attributes: {} },
    ]),
    [{ attributes: [], variantIds: ["first", "second"] }],
  );
  assert.equal(
    resolveUniqueVariantByAttributes(
      [
        { id: "first", attributes: {} },
        { id: "second", attributes: {} },
      ],
      {},
    ),
    null,
  );
});

test("one empty attribute Variant resolves as the default", () => {
  assert.equal(
    resolveUniqueVariantByAttributes([{ id: "only", attributes: {} }], {})?.id,
    "only",
  );
});

test("attribute identity preserves exact key and value casing", () => {
  const variants = [
    { id: "canonical", attributes: { color: "red" } },
    { id: "key-case", attributes: { Color: "red" } },
    { id: "value-case", attributes: { color: "Red" } },
  ];
  assert.equal(
    resolveUniqueVariantByAttributes(variants, { color: "red" })?.id,
    "canonical",
  );
  assert.deepEqual(findAmbiguousVariantCombinations(variants), []);
});

test("mixed unique and ambiguous combinations resolve only the unique selection", () => {
  const variants = [
    { id: "1", attributes: { size: "S", color: "red" } },
    { id: "2", attributes: { size: "M", color: "red" } },
    { id: "3", attributes: { color: "red", size: "M" } },
  ];

  assert.equal(
    resolveUniqueVariantByAttributes(variants, { color: "red", size: "S" })?.id,
    "1",
  );
  assert.equal(
    resolveUniqueVariantByAttributes(variants, { size: "M", color: "red" }),
    null,
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

test("configuration analysis owns ambiguity without making it an assertion failure", async () => {
  const [validator, mapper] = await Promise.all([
    readFile(new URL("./assert-product-configuration.ts", import.meta.url), "utf8"),
    readFile(new URL("../api/product-mappers.ts", import.meta.url), "utf8"),
  ]);
  assert.match(validator, /analyzeProductConfiguration/);
  assert.match(validator, /findAmbiguousVariantCombinations/);
  assert.doesNotMatch(validator, /throw new ProductConfigurationError/);
  assert.doesNotMatch(mapper, /console\.error|reportAmbiguousVariantCombinations/);
});

test("Quick Add keeps unique-only resolution instead of globally rejecting mixed ambiguity", async () => {
  const boundary = await readFile(
    new URL("../server/quick-add-selection-boundary.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(boundary, /ProductConfigurationError/);
  assert.doesNotMatch(boundary, /error\.diagnostic/);
});

test("PDP analyzes and reports ambiguity without throwing it through the page", async () => {
  const page = await readFile(
    new URL("../../../app/[locale]/(storefront)/products/[slug]/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(page, /analyzeProductConfiguration\(product\)/);
  assert.match(page, /reportProductConfigurationIssues/);
  assert.doesNotMatch(page, /ProductConfigurationError/);
});

test("PDP purchase composition resolves by variant ID and fails closed for missing identity", async () => {
  const experience = await readFile(
    new URL("../components/product-details/product-purchase-experience.tsx", import.meta.url),
    "utf8",
  );
  assert.match(experience, /selectedVariant !== null/);
  assert.match(experience, /variant\.id === selectedVariantId/);
  assert.doesNotMatch(experience, /resolveProductVariant/);
  assert.match(experience, /variantId: selectedVariant\.id/);
  assert.match(
    experience,
    /const availability = selectedVariant[\s\S]*purchase_unavailable/,
  );
});
