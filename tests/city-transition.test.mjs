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
  vm.runInNewContext(outputText, {
    module: loadedModule,
    exports: loadedModule.exports,
    require: (specifier) =>
      specifier.startsWith("@/")
        ? loadSource(`src/${specifier.slice(2)}`)
        : require(specifier),
  }, { filename });
  return loadedModule.exports;
}

const {
  canStartCityTransition,
  cityTransitionReducer,
  createCityTransitionState,
  shouldShowStorefrontSyncVeil,
} = loadSource("src/features/location/city-transition-state");

const cityA = { id: 1, name: "A", regionId: 10 };
const cityB = { id: 2, name: "B", regionId: 20 };
const cityC = { id: 3, name: "C", regionId: 30 };
const start = (state, city, generation) =>
  cityTransitionReducer(state, {
    type: "selection-started",
    city,
    generation,
  });

test("idle A selecting B enters persisting without visually committing B", () => {
  const state = start(createCityTransitionState(cityA), cityB, 1);
  assert.equal(state.status, "persisting");
  assert.equal(state.committedCity.id, cityA.id);
  assert.equal(state.pendingCity.id, cityB.id);
});

test("persistence success commits B client-side and enters syncing", () => {
  const state = cityTransitionReducer(
    start(createCityTransitionState(cityA), cityB, 1),
    { type: "persistence-succeeded", generation: 1 },
  );
  assert.equal(state.status, "syncing");
  assert.equal(state.committedCity.id, cityB.id);
  assert.equal(state.pendingCity.id, cityB.id);
});

test("matching server acknowledgement finishes syncing B", () => {
  let state = start(createCityTransitionState(cityA), cityB, 1);
  state = cityTransitionReducer(state, { type: "persistence-succeeded", generation: 1 });
  state = cityTransitionReducer(state, { type: "server-city-received", city: cityB });
  assert.equal(state.status, "idle");
  assert.equal(state.committedCity.id, cityB.id);
  assert.equal(state.pendingCity, null);
});

test("persistence failure retains A and clears pending B", () => {
  const state = cityTransitionReducer(
    start(createCityTransitionState(cityA), cityB, 1),
    { type: "persistence-failed", generation: 1 },
  );
  assert.equal(state.status, "failed");
  assert.equal(state.committedCity.id, cityA.id);
  assert.equal(state.pendingCity, null);
  assert.equal(state.error, true);
});

test("first-city persistence failure keeps the committed city null", () => {
  const state = cityTransitionReducer(
    start(createCityTransitionState(null), cityB, 1),
    { type: "persistence-failed", generation: 1 },
  );
  assert.equal(state.status, "failed");
  assert.equal(state.committedCity, null);
  assert.equal(state.pendingCity, null);
});

test("selecting the committed city is a no-op", () => {
  const state = createCityTransitionState(cityA);
  assert.equal(start(state, cityA, 1), state);
});

test("a second selection while persisting or syncing is ignored", () => {
  const persisting = start(createCityTransitionState(cityA), cityB, 1);
  assert.equal(start(persisting, cityC, 2), persisting);
  const syncing = cityTransitionReducer(persisting, {
    type: "persistence-succeeded",
    generation: 1,
  });
  assert.equal(start(syncing, cityC, 2), syncing);
});

test("the public transition-start gate rejects persisting and syncing state", () => {
  const persisting = start(createCityTransitionState(cityA), cityB, 1);
  assert.equal(canStartCityTransition(persisting, cityC, false), false);

  const syncing = cityTransitionReducer(persisting, {
    type: "persistence-succeeded",
    generation: 1,
  });
  assert.equal(canStartCityTransition(syncing, cityC, false), false);
  assert.equal(canStartCityTransition(createCityTransitionState(cityA), cityB, true), false);
  assert.equal(canStartCityTransition(createCityTransitionState(cityA), cityB, false), true);
});

test("stale server city cannot overwrite the expected target", () => {
  let state = start(createCityTransitionState(cityA), cityC, 2);
  state = cityTransitionReducer(state, { type: "persistence-succeeded", generation: 2 });
  const stale = cityTransitionReducer(state, { type: "server-city-received", city: cityB });
  assert.equal(stale, state);
  assert.equal(stale.committedCity.id, cityC.id);
  assert.equal(stale.status, "syncing");
});

test("stale async completion cannot finish a newer generation", () => {
  const state = start(createCityTransitionState(cityB), cityC, 2);
  assert.equal(
    cityTransitionReducer(state, { type: "persistence-succeeded", generation: 1 }),
    state,
  );
  assert.equal(
    cityTransitionReducer(state, { type: "persistence-failed", generation: 1 }),
    state,
  );
});

test("an idle server-city update synchronizes the client mirror", () => {
  const state = cityTransitionReducer(createCityTransitionState(cityA), {
    type: "server-city-received",
    city: cityB,
  });
  assert.equal(state.status, "idle");
  assert.equal(state.committedCity.id, cityB.id);
});

test("null initial city can persist and acknowledge a first selection", () => {
  let state = start(createCityTransitionState(null), cityB, 1);
  assert.equal(state.committedCity, null);
  state = cityTransitionReducer(state, { type: "persistence-succeeded", generation: 1 });
  state = cityTransitionReducer(state, { type: "server-city-received", city: cityB });
  assert.equal(state.status, "idle");
  assert.equal(state.committedCity.id, cityB.id);
});

test("the storefront sync veil is active only while syncing", () => {
  assert.equal(shouldShowStorefrontSyncVeil("idle"), false);
  assert.equal(shouldShowStorefrontSyncVeil("persisting"), false);
  assert.equal(shouldShowStorefrontSyncVeil("syncing"), true);
  assert.equal(shouldShowStorefrontSyncVeil("failed"), false);
});

test("the storefront sync veil preserves its non-blocking accessibility contracts", () => {
  const veil = readFileSync(
    path.join(root, "src/features/location/components/storefront-sync-veil.tsx"),
    "utf8",
  );
  assert.ok(veil.includes('aria-hidden="true"'));
  assert.ok(veil.includes("pointer-events-none"));
  assert.equal(veil.includes("aria-live"), false);
  assert.equal(/backdrop-(?:blur|filter)/.test(veil), false);
  assert.equal(veil.includes("backdropFilter"), false);
  assert.ok(veil.includes("useBrowsingCity()"));
  assert.equal(veil.includes("setGuestCityId"), false);
  assert.equal(veil.includes("router.refresh"), false);
  assert.equal(veil.includes("fetch("), false);
});

test("the Server storefront layout keeps route content rendered beneath the veil", () => {
  const layout = readFileSync(
    path.join(root, "src/app/[locale]/(storefront)/layout.tsx"),
    "utf8",
  );
  const header = layout.indexOf("<Header");
  const main = layout.indexOf("<main");
  const children = layout.indexOf("{children}", main);
  const veil = layout.indexOf("<StorefrontSyncVeil />", main);
  assert.equal(layout.includes('"use client"'), false);
  assert.ok(header >= 0 && header < main);
  assert.ok(main >= 0 && children > main && veil > children);
  assert.equal(layout.includes("Skeleton"), false);
});

test("null-city failure copy is complete in Arabic and English", () => {
  for (const locale of ["ar", "en"]) {
    const messages = JSON.parse(
      readFileSync(path.join(root, `src/messages/${locale}/common.json`), "utf8"),
    );
    const copy = messages.headerUtility.cityTransition.failedWithoutCommittedCity;
    assert.ok(copy.length > 0);
    assert.equal(copy.includes("{city}"), false);
    assert.equal(/\s{2,}/.test(copy), false);
  }
});

test("changing state keeps the return-focus trigger natively enabled and interaction-locked", () => {
  const controller = readFileSync(
    path.join(root, "src/features/location/components/LocationController.tsx"),
    "utf8",
  );
  const selector = readFileSync(
    path.join(root, "src/components/shared/LocationSelector.tsx"),
    "utf8",
  );
  assert.equal(controller.includes("disabled={isChanging}"), false);
  assert.ok(controller.includes("aria-disabled={isChanging || undefined}"));
  assert.match(controller, /const handleOpen = \(\) => \{\s*if \(isChanging\) return;/);
  assert.ok(selector.includes("aria-disabled:cursor-not-allowed aria-disabled:opacity-50"));
});

test("Cart compatibility notification is owned by the provider after persistence", () => {
  const provider = readFileSync(
    path.join(root, "src/features/location/components/browsing-city-provider.tsx"),
    "utf8",
  );
  const controller = readFileSync(
    path.join(root, "src/features/location/components/LocationController.tsx"),
    "utf8",
  );
  const success = provider.indexOf('type: "persistence-succeeded"');
  const notification = provider.indexOf("notifyBrowsingCitySelected(city.id)");
  assert.ok(success >= 0 && notification > success);
  assert.equal(controller.includes("notifyBrowsingCitySelected"), false);
  assert.equal(controller.includes("setGuestCityId"), false);
});

test("persistence rejection path neither publishes B nor refreshes for B", () => {
  const provider = readFileSync(
    path.join(root, "src/features/location/components/browsing-city-provider.tsx"),
    "utf8",
  );
  const rejectionBranch = provider.slice(provider.indexOf("persistence-failed"));
  assert.equal(rejectionBranch.includes("notifyBrowsingCitySelected"), false);
  assert.equal(rejectionBranch.includes("router.refresh"), false);
});

