import assert from "node:assert/strict";
import test from "node:test";

import {
  assertExpectedQuickAddCity,
  canSubmitQuickAddSelection,
  getRevalidatedQuickAddJourney,
  getQuickAddFailureRefreshTargets,
  getQuickAddRemainingQuantity,
  projectQuickAddSelectionData,
  quickAddCityContextMatches,
  quickAddSelectionQueryKey,
} from "./quick-add-selection.ts";

test("selector query identity includes locale, slug, and committed city", () => {
  assert.deepEqual(quickAddSelectionQueryKey("ar", "gift-ring", 27), [
    "product",
    "quick-add",
    "ar",
    "gift-ring",
    27,
  ]);
});

test("the expected city is only accepted when it matches durable authority", () => {
  assert.equal(assertExpectedQuickAddCity(27, null), "location-required");
  assert.equal(
    assertExpectedQuickAddCity(27, 28),
    "city-context-changed",
  );
  assert.equal(assertExpectedQuickAddCity(27, 27), "ok");
});

test("remaining quantity subtracts all existing lines for the exact variant", () => {
  const cart = {
    lines: [
      { quantity: 2, variant: { id: "variant-a" } },
      { quantity: 1, variant: { id: "variant-b" } },
      { quantity: 3, variant: { id: "variant-a" } },
    ],
  };
  assert.equal(getQuickAddRemainingQuantity(8, cart, "variant-a"), 3);
  assert.equal(getQuickAddRemainingQuantity(8, undefined, "variant-a"), null);
});

test("Add requires an exact available variant, safe quantity, and current city", () => {
  const valid = {
    availability: { status: "available", maxOrderQuantity: 5 },
    cityContextMatches: true,
    cityTransitionLocked: false,
    mutationLocked: false,
    quantity: 2,
    remainingAddable: 3,
    variantId: "variant-a",
  };
  assert.equal(canSubmitQuickAddSelection(valid), true);
  assert.equal(
    canSubmitQuickAddSelection({ ...valid, variantId: null }),
    false,
  );
  assert.equal(
    canSubmitQuickAddSelection({
      ...valid,
      availability: { status: "out_of_stock" },
    }),
    false,
  );
  assert.equal(
    canSubmitQuickAddSelection({ ...valid, quantity: 4 }),
    false,
  );
  assert.equal(
    canSubmitQuickAddSelection({ ...valid, cityTransitionLocked: true }),
    false,
  );
  assert.equal(
    canSubmitQuickAddSelection({ ...valid, cityContextMatches: false }),
    false,
  );
  assert.equal(
    canSubmitQuickAddSelection({ ...valid, mutationLocked: true }),
    false,
  );
});

test("loaded selector data only matches the current committed city", () => {
  assert.equal(quickAddCityContextMatches(27, 27), true);
  assert.equal(quickAddCityContextMatches(27, 28), false);
  assert.equal(quickAddCityContextMatches(27, null), false);
});

test("server journey revalidation never turns changed data into an Add", () => {
  assert.equal(getRevalidatedQuickAddJourney(true, 2), "customize");
  assert.equal(getRevalidatedQuickAddJourney(false, 1), "direct");
  assert.equal(getRevalidatedQuickAddJourney(false, 0), "unavailable");
  assert.equal(getRevalidatedQuickAddJourney(false, 2), "selection");
});

test("quantity-limit recovery refreshes the exact selector and canonical Cart", () => {
  assert.deepEqual(getQuickAddFailureRefreshTargets("quantity-limit-exceeded"), {
    canonicalCart: true,
    selection: true,
  });
});

test("other availability failures refresh only selector availability", () => {
  for (const code of ["out-of-stock", "unavailable-at-location", "variant-invalid"]) {
    assert.deepEqual(getQuickAddFailureRefreshTargets(code), {
      canonicalCart: false,
      selection: true,
    });
  }
  assert.deepEqual(getQuickAddFailureRefreshTargets("service-unavailable"), {
    canonicalCart: false,
    selection: false,
  });
});

test("the browser DTO excludes warehouse stock and unrelated ProductDetails", () => {
  const data = projectQuickAddSelectionData(
    {
      id: "product-1",
      name: "Gift",
      options: [],
      slug: "gift",
      variants: [
        {
          attributes: { size: "large" },
          id: "variant-1",
          pricing: {
            compareAt: null,
            current: { amount: 100, currency: "SAR" },
            promotion: null,
          },
          warehouseStocks: [{ quantity: 99, warehouseId: 4 }],
        },
      ],
      description: { html: "must not escape" },
    },
    { id: 27, name: "Riyadh" },
    { "variant-1": { status: "available", maxOrderQuantity: 5 } },
  );
  assert.deepEqual(Object.keys(data.product).sort(), [
    "id",
    "name",
    "options",
    "slug",
    "variants",
  ]);
  assert.deepEqual(Object.keys(data.product.variants[0]).sort(), [
    "attributes",
    "availability",
    "id",
    "pricing",
  ]);
  assert.equal("warehouseStocks" in data.product.variants[0], false);
  assert.equal("description" in data.product, false);
});
