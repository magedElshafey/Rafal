import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { QueryClient } from "@tanstack/react-query";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const tick = () => new Promise((resolve) => setImmediate(resolve));
const context = { accountId: null, locale: "en", browsingCityId: 1, fulfillmentCityId: 1 };
const input = { productId: "1", variantId: "1", quantity: 1 };
const giftInput = { kind: "disable-gift", giftWrap: true, isAnonymous: false, message: null };
const snapshot = (label) => ({ lines: label ? [{ product: { id: label }, availability: { cityId: 1 } }] : [], gift: { isGift: false } });
const answer = (token, label) => ({ success: true, data: { token, snapshot: snapshot(label) } });

function harness() {
  const modules = new Map();
  const state = { token: null, persistedTokens: [], calls: [], carts: new Map(), pending: [], delay: false, next: 0, rotated: null };
  const write = async (kind, identity) => {
    state.calls.push({ kind, token: identity.token });
    if (kind === "clear") { if (identity.token) state.carts.delete(identity.token); return answer(identity.token, null); }
    if (state.delay) return new Promise((resolve) => state.pending.push({ kind, identity, resolve }));
    const token = state.rotated ?? identity.token ?? `synthetic-private-${++state.next}`;
    const label = `product-${state.next}`; state.carts.set(token, label);
    return answer(token, label);
  };
  const stubs = {
    "server-only": {},
    "@/features/auth/server/auth-session": { getAccessToken: async () => null },
    "@/features/auth/server/auth-boundary": { getCurrentUser: async () => null },
    "@/features/location/server/guest-city-session": { readGuestCityId: async () => 1 },
    "@/features/cart/server/guest-cart-session": {
      getGuestCartToken: async () => state.token,
      persistGuestCartToken: async (token) => { state.persistedTokens.push(token); state.token = token; },
      deleteGuestCartToken: async () => { state.token = null; },
    },
    "@/features/cart/api/cart-mapper": { mapCartData: (data) => data.snapshot },
    "@/features/products/api/product-mappers": { mapRecommendationProducts: (products) => products },
    "@/features/cart/api/cart-api.server": {
      addCartItemDto: (identity) => write("add", identity),
      updateCartGiftDto: (identity) => write("gift", identity),
      updateCartItemDto: (identity) => write("quantity", identity),
      removeCartItemDto: (identity) => write("remove", identity),
      clearCartDto: (identity) => write("clear", identity),
      getCartDto: async (identity) => answer(identity.token, state.carts.get(identity.token)),
      getCartRecommendationsDto: async (identity) => ({ success: true, data: {
        frequently_ordered_with: [{ id: `recommended-${state.carts.get(identity.token)}` }], related: [],
      } }),
    },
    "@/features/checkout/server/parse-checkout-place-request": { parseCheckoutPlaceRequest: (value) => value },
    "@/features/checkout/api/checkout-api.server": { placeCheckout: async (identity) => {
      state.carts.delete(identity.token);
      return { kind: "verification-required", orderNumber: "test-order" };
    } },
  };
  function load(relative) {
    const base = path.resolve(root, relative);
    const filename = [base, `${base}.ts`].find(existsSync); assert.ok(filename, relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loaded = { exports: {} }; modules.set(filename, loaded);
    const localRequire = (name) => Object.hasOwn(stubs, name) ? stubs[name] :
      name.startsWith("@/") ? load(`src/${name.slice(2)}`) :
      name.startsWith(".") ? load(path.relative(root, path.resolve(path.dirname(filename), name))) : require(name);
    const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    } }).outputText;
    vm.runInThisContext(`(function(require,module,exports,fetch){${code}\n})`, { filename })(localRequire, loaded, loaded.exports,
      async (url, init) => load(url.includes("/recommendations") ? "src/app/api/cart/recommendations/route" : "src/app/api/cart/route")
        .GET(new Request(`https://store.test${url}`, init)));
    return loaded.exports;
  }
  const lifecycle = load("src/features/cart/api/cart-recommendation-lifecycle");
  const queries = load("src/features/cart/api/cart-recommendations-query");
  const cartQueries = load("src/features/cart/api/cart-query");
  const boundary = load("src/features/cart/server/cart-boundary");
  function tab(peers) {
    const client = new QueryClient();
    const listeners = new Set();
    const channel = { addEventListener: (type, fn) => { if (type === "message") listeners.add(fn); },
      removeEventListener: (type, fn) => { if (type === "message") listeners.delete(fn); },
      postMessage: (data) => { for (const other of peers) if (other.channel !== channel) queueMicrotask(() => other.receive(data)); } };
    const result = { client, channel, receive: (data) => listeners.forEach((fn) => fn({ data })) };
    peers.push(result);
    result.connection = lifecycle.connectRecommendationLifecycle(client, channel, true);
    result.close = () => { result.connection.disconnect(); client.clear(); };
    return result;
  }
  async function operation(tab, kind) {
    const transition = lifecycle.beginRecommendationTransition(tab.client);
    await transition.ready;
    try {
      if (kind === "checkout") {
        const response = await load("src/app/api/checkout/place/route").POST(new Request("https://store.test/api/checkout/place?locale=en", {
          method: "POST", body: JSON.stringify({ buyer: { kind: "guest" } }),
        }));
        assert.equal(response.status, 200);
        await tab.client.cancelQueries({ queryKey: cartQueries.currentCartQueryKeyRoot });
        cartQueries.removeCurrentCartQueries(tab.client);
        return;
      }
      const result = kind === "clear" ? await boundary.clearCurrentCart("en") : kind === "gift"
        ? { ok: true, cart: await boundary.updateCurrentCartGift(giftInput, "en") } : await boundary.addLineToCurrentCart(input, "en");
      assert.equal(result.ok, true);
      cartQueries.setCurrentCartQueryData(tab.client, "en", result.cart);
      if (kind === "add") await queries.invalidateCartRecommendations(tab.client);
    } finally { transition.finish(); }
  }
  async function read(tab) {
    const generation = lifecycle.getRecommendationGate(tab.client).generation;
    assert.equal(lifecycle.isRecommendationGenerationCurrent(tab.client, generation), true);
    const evidence = await cartQueries.reconcileRecommendationCart("en", 1, new AbortController().signal, null);
    assert.equal(evidence.accountId, null);
    return tab.client.fetchQuery(queries.cartRecommendationsQueryOptions(context, {
      generation, current: () => lifecycle.isRecommendationGenerationCurrent(tab.client, generation),
    }));
  }
  function complete(index, label) {
    const token = `synthetic-private-${label}`;
    state.carts.set(token, label);
    state.pending[index].resolve(answer(token, label));
  }
  return { state, load, lifecycle, queries, cartQueries, boundary, tab, operation, read, complete };
}

test("new Guest Add, subsequent Add, and Gift-created Cart reconcile without exposing credentials", async () => {
  for (const kind of ["add", "gift"]) {
    const h = harness(), tab = h.tab([]);
    try {
      await tick(); await h.operation(tab, kind); await tick();
      const firstToken = h.state.token; assert.ok(firstToken);
      assert.equal((await h.read(tab)).frequentlyOrderedWith[0].id, "recommended-product-1");
      await h.operation(tab, "add"); await tick();
      assert.equal(h.state.token, firstToken);
      const data = await h.read(tab);
      assert.equal(JSON.stringify(data).includes(firstToken), false);
      assert.equal(JSON.stringify(tab.client.getQueryCache().getAll().map((entry) => entry.queryKey)).includes(firstToken), false);
    } finally { tab.close(); }
  }
});

test("Gift creation persists a token, ordinary Gift updates preserve it, and rotation is rejected", async () => {
  const h = harness();
  await h.boundary.updateCurrentCartGift(giftInput, "en");
  const token = h.state.token;
  assert.ok(token);
  assert.deepEqual(h.state.persistedTokens, [token]);
  await h.boundary.updateCurrentCartGift({ ...giftInput, giftWrap: false, message: "Gift note" }, "en");
  assert.equal(h.state.calls.at(-1).token, token);
  assert.equal(h.state.token, token);
  assert.deepEqual(h.state.persistedTokens, [token]);
  h.state.rotated = "unexpected-replacement";
  await assert.rejects(() => h.boundary.updateCurrentCartGift(giftInput, "en"), /rotated/);
  assert.equal(h.state.token, token);
  assert.deepEqual(h.state.persistedTokens, [token]);
});

test("Gift writes retain the safety gate when an existing Cart projection outlives its Guest cookie", async () => {
  const h = harness(), tab = h.tab([]);
  try {
    await tick(); await h.operation(tab, "add"); await tick(); await h.read(tab);
    const oldToken = h.state.token;
    // A browser Cart projection cannot prove a cookie still exists at dispatch.
    h.state.token = null;
    h.state.delay = true;
    const updating = h.operation(tab, "gift");
    await tick();
    assert.equal(h.state.pending[0].identity.token, null);
    assert.equal(h.lifecycle.canReconcileRecommendations(h.lifecycle.getRecommendationGate(tab.client)), false);
    assert.equal(tab.client.getQueryData(h.queries.cartRecommendationsQueryKey(context)), undefined);
    h.complete(0, "gift-replacement"); await updating; await tick();
    assert.notEqual(h.state.token, oldToken);
    assert.equal((await h.read(tab)).frequentlyOrderedWith[0].id, "recommended-gift-replacement");
  } finally { tab.close(); }
});

test("Guest Checkout and Clear remove old results and allow a freshly created Cart", async () => {
  for (const kind of ["checkout", "clear"]) {
    const h = harness(), tab = h.tab([]);
    try {
      await tick(); await h.operation(tab, "add"); await tick(); await h.read(tab);
      const oldToken = h.state.token;
      await h.operation(tab, kind); await tick();
      assert.equal(h.state.token, null);
      assert.equal(tab.client.getQueryData(h.queries.cartRecommendationsQueryKey(context)), undefined);
      await assert.rejects(() => h.read(tab));
      await h.operation(tab, "add"); await tick();
      assert.notEqual(h.state.token, oldToken);
      assert.equal((await h.read(tab)).frequentlyOrderedWith[0].id, "recommended-product-2");
    } finally { tab.close(); }
  }
});

test("concurrent first Adds in two tabs stay blocked until both cookie writes settle in either order", async () => {
  for (const order of [[0, 1], [1, 0]]) {
    const h = harness(), peers = [], a = h.tab(peers), b = h.tab(peers);
    try {
      await tick(); h.state.delay = true;
      const first = h.operation(a, "add"), second = h.operation(b, "add");
      await tick(); assert.deepEqual(h.state.pending.map((entry) => entry.identity.token), [null, null]);
      const operations = [first, second];
      h.complete(order[0], `cart-${order[0]}`); await operations[order[0]]; await tick();
      for (const tab of peers) assert.equal(h.lifecycle.canReconcileRecommendations(h.lifecycle.getRecommendationGate(tab.client)), false);
      h.complete(order[1], `cart-${order[1]}`); await operations[order[1]]; await tick();
      for (const tab of peers) assert.equal((await h.read(tab)).frequentlyOrderedWith[0].id, `recommended-cart-${order[1]}`);
    } finally { a.close(); b.close(); }
  }
});

test("pending first Add overlapping Clear or Checkout cannot publish the earlier Cart", async () => {
  for (const kind of ["clear", "checkout"]) {
    const h = harness(), peers = [], a = h.tab(peers), b = h.tab(peers);
    try {
      await tick(); h.state.delay = true;
      const early = h.operation(a, "add"), late = h.operation(b, "add");
      await tick(); h.complete(0, "early"); await early; await tick();
      const clearing = h.operation(a, kind); await clearing; await tick();
      assert.equal(h.state.token, null);
      for (const tab of peers) assert.equal(h.lifecycle.canReconcileRecommendations(h.lifecycle.getRecommendationGate(tab.client)), false);
      h.complete(1, "late"); await late; await tick();
      for (const tab of peers) assert.equal((await h.read(tab)).frequentlyOrderedWith[0].id, "recommended-late");
    } finally { a.close(); b.close(); }
  }
});

test("line changes cannot create a Guest token; ordinary quantity changes keep the generation and recommendations", async () => {
  const h = harness(), tab = h.tab([]);
  try {
    await tick();
    for (const mutate of [() => h.boundary.updateCurrentCartLine("1", 2, "en"), () => h.boundary.removeCurrentCartLine("1", "en")]) {
      assert.deepEqual(await mutate(), { ok: false, error: { code: "cart-session-failure" } });
    }
    assert.equal(h.state.calls.length, 0);
    await h.operation(tab, "add"); await tick(); const before = await h.read(tab);
    const generation = h.lifecycle.getRecommendationGate(tab.client).generation;
    const result = await h.boundary.updateCurrentCartLine("1", 2, "en");
    h.cartQueries.setCurrentCartQueryData(tab.client, "en", result.cart);
    assert.equal(h.lifecycle.getRecommendationGate(tab.client).generation, generation);
    assert.equal(tab.client.getQueryData(h.queries.cartRecommendationsQueryKey(context)), before);
    assert.equal(tab.client.getQueryState(h.queries.cartRecommendationsQueryKey(context)).isInvalidated, false);
    const token = h.state.token; h.state.rotated = "unexpected-replacement";
    await assert.rejects(() => h.boundary.updateCurrentCartLine("1", 2, "en"), /rotated/);
    assert.equal(h.state.token, token);
  } finally { tab.close(); }
});
