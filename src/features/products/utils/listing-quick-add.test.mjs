import assert from "node:assert/strict";
import test from "node:test";

import {
  canStartQuickAdd,
  deriveListingQuickAdd,
  getDirectQuickAddInput,
} from "./listing-quick-add.ts";

const variant = (id) => ({ id });

test("personalizable products continue to customization", () => {
  assert.deepEqual(
    deriveListingQuickAdd({ is_personalizable: true, variants: [variant(17)] }),
    { kind: "customize" },
  );
});

test("one non-personalizable variant preserves its exact ID for direct Add", () => {
  const quickAdd = deriveListingQuickAdd({
    is_personalizable: false,
    variants: [variant(42)],
  });
  assert.deepEqual(quickAdd, { kind: "direct", variantId: "42" });
  assert.deepEqual(getDirectQuickAddInput("product-7", quickAdd), {
    productId: "product-7",
    variantId: "42",
    quantity: 1,
  });
});

test("multiple variants require selection and never produce an Add input", () => {
  const quickAdd = deriveListingQuickAdd({
    is_personalizable: false,
    variants: [variant(1), variant(2)],
  });
  assert.deepEqual(quickAdd, { kind: "select-options" });
  assert.equal(getDirectQuickAddInput("product-7", quickAdd), null);
});

test("customization never produces an Add input", () => {
  assert.equal(
    getDirectQuickAddInput("product-7", { kind: "customize" }),
    null,
  );
});

test("city transition and pending activation independently block Quick Add", () => {
  const unlocked = {
    activationLocked: false,
    cityTransitionLocked: false,
    disabled: false,
    pending: false,
  };
  assert.equal(canStartQuickAdd(unlocked), true);
  assert.equal(
    canStartQuickAdd({ ...unlocked, cityTransitionLocked: true }),
    false,
  );
  assert.equal(canStartQuickAdd({ ...unlocked, pending: true }), false);
  assert.equal(canStartQuickAdd({ ...unlocked, activationLocked: true }), false);
});
