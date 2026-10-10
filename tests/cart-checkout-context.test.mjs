import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);

function loadSource(relativePath) {
  const base = path.join(root, relativePath);
  const filename = [base, `${base}.ts`].find(existsSync);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const loadedModule = { exports: {} };
  vm.runInNewContext(
    outputText,
    {
      module: loadedModule,
      exports: loadedModule.exports,
      require: (specifier) =>
        specifier.startsWith("@/")
          ? loadSource(`src/${specifier.slice(2)}`)
          : require(specifier),
    },
    { filename },
  );
  return loadedModule.exports;
}

const {
  canContinueCartCheckout,
  createCartCheckoutContextSnapshot,
  updateCartCheckoutContextSnapshot,
} = loadSource("src/features/cart/utils/cart-checkout-context");

const context = (overrides = {}) => ({
  browsingCityId: 1,
  cityTransitionLocked: false,
  cityTransitionStatus: "idle",
  fulfillmentCityId: 1,
  ...overrides,
});

test("same checkout context allows navigation", () => {
  const started = createCartCheckoutContextSnapshot(context());
  assert.equal(canContinueCartCheckout(started, started), true);
});

test("an active transition lock denies navigation", () => {
  const started = createCartCheckoutContextSnapshot(context());
  const current = updateCartCheckoutContextSnapshot(
    started,
    context({ cityTransitionLocked: true, cityTransitionStatus: "persisting" }),
  );
  assert.equal(canContinueCartCheckout(started, current), false);
});

test("a completed transition retains a newer revision and denies stale preparation", () => {
  const started = createCartCheckoutContextSnapshot(context());
  const persisting = updateCartCheckoutContextSnapshot(
    started,
    context({ cityTransitionLocked: true, cityTransitionStatus: "persisting" }),
  );
  const current = updateCartCheckoutContextSnapshot(persisting, context());
  assert.equal(current.revision, started.revision + 2);
  assert.equal(canContinueCartCheckout(started, current), false);
});

test("a browsing-city change denies navigation", () => {
  const started = createCartCheckoutContextSnapshot(context());
  const current = updateCartCheckoutContextSnapshot(
    started,
    context({ browsingCityId: 2, fulfillmentCityId: 2 }),
  );
  assert.equal(canContinueCartCheckout(started, current), false);
});

test("a fulfillment-city change denies navigation", () => {
  const started = createCartCheckoutContextSnapshot(context());
  const current = updateCartCheckoutContextSnapshot(
    started,
    context({ fulfillmentCityId: 9 }),
  );
  assert.equal(canContinueCartCheckout(started, current), false);
});

test("an unrelated rerender preserves the revision and preparation", () => {
  const started = createCartCheckoutContextSnapshot(context());
  const current = updateCartCheckoutContextSnapshot(started, context());
  assert.equal(current, started);
  assert.equal(canContinueCartCheckout(started, current), true);
});

test("a stable Gift fulfillment override remains valid and its change invalidates", () => {
  const started = createCartCheckoutContextSnapshot(
    context({ browsingCityId: 1, fulfillmentCityId: 9 }),
  );
  const stable = updateCartCheckoutContextSnapshot(
    started,
    context({ browsingCityId: 1, fulfillmentCityId: 9 }),
  );
  const changed = updateCartCheckoutContextSnapshot(
    stable,
    context({ browsingCityId: 1, fulfillmentCityId: 10 }),
  );
  assert.equal(canContinueCartCheckout(started, stable), true);
  assert.equal(canContinueCartCheckout(started, changed), false);

  const currentCart = readFileSync(
    path.join(root, "src/features/cart/hooks/use-current-cart.ts"),
    "utf8",
  );
  assert.ok(
    currentCart.includes(
      "const fulfillmentCityId = giftRecipient?.city.id ?? browsingCityId;",
    ),
  );
});
