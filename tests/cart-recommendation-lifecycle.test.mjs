import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { QueryClient, QueryObserver } from "@tanstack/react-query";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const tick = () => new Promise((resolve) => setImmediate(resolve));
const context = { accountId: "account-1", locale: "en", browsingCityId: 1, fulfillmentCityId: 1 };
const snapshot = { lines: [{ product: { id: "1" }, availability: { cityId: 1 } }], gift: { isGift: false } };
const payload = { frequentlyOrderedWith: [{ id: "2" }], related: [{ id: "3" }] };
const response = (data, id = "account-1") => Response.json(data, { headers: id ? { "X-Rafal-Account-Id": id } : {} });

function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const modules = new Map(), observers = [], effects = [], pendingEffects = [];
  let queryIndex = 0, effectIndex = 0;
  const state = { calls: [], user: { id: "account-1" }, guestToken: null,
    respond: async (url) => response(String(url).includes("/recommendations") ? payload : snapshot) };
  function load(relative) {
    const base = path.resolve(root, relative);
    const filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    assert.ok(filename, relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loaded = { exports: {} }; modules.set(filename, loaded);
    const localRequire = (name) => {
      if (name === "server-only") return {};
      if (name === "react") return { useEffect: (callback, deps) => {
        const index = effectIndex++, old = effects[index];
        if (!old || deps.some((value, i) => value !== old.deps[i])) pendingEffects.push(() => {
          old?.cleanup?.(); effects[index] = { deps, cleanup: callback() };
        });
      } };
      if (name === "@tanstack/react-query") return { ...require(name), useQueryClient: () => client, useQuery: (options) => {
        const index = queryIndex++;
        if (!observers[index]) {
          const observer = new QueryObserver(client, options);
          observers[index] = { observer, unsubscribe: observer.subscribe(() => {}) };
        } else observers[index].observer.setOptions(options);
        return observers[index].observer.getCurrentResult();
      } };
      if (name === "@/features/auth/server/auth-boundary") return { getCurrentUser: async () => state.user };
      if (name === "@/features/cart/server/cart-auth-context") return { resolveCartTransportIdentity: async () => state.user
        ? { kind: "authenticated", bearerToken: "test-auth" } : { kind: "guest", token: state.guestToken } };
      if (name === "@/features/cart/server/cart-boundary") return { getCurrentCart: async () => snapshot };
      if (name === "@/features/settings/server/public-settings-boundary") return { getPublicSettings: async () => {
        state.settingsReads = (state.settingsReads ?? 0) + 1;
        if (state.settingsFail) throw new Error("settings unavailable");
        return { maxCartItemQuantity: 7 };
      } };
      if (name === "@/features/cart/server/cart-recommendations-boundary") return { getCartRecommendations: async () => payload };
      if (name.startsWith("@/")) return load(`src/${name.slice(2)}`);
      if (name.startsWith(".")) return load(path.relative(root, path.resolve(path.dirname(filename), name)));
      return require(name);
    };
    const code = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInThisContext(`(function(require,module,exports,fetch){${code}\n})`, { filename })(localRequire, loaded, loaded.exports,
      async (url, init) => { state.calls.push({ url, ...init }); return state.respond(url, init); });
    return loaded.exports;
  }
  const lifecycle = load("src/features/cart/api/cart-recommendation-lifecycle");
  const queries = load("src/features/cart/api/cart-recommendations-query");
  function render(input = {}) {
    queryIndex = 0; effectIndex = 0;
    const result = load("src/features/cart/hooks/use-cart-recommendations").useCartRecommendations({
      ...context, contextReady: true, projectionReady: true, empty: false, ...input,
    });
    pendingEffects.splice(0).forEach((effect) => effect());
    return result;
  }
  async function settle(input) {
    let result;
    for (let i = 0; i < 8; i++) { result = render(input); await tick(); }
    return result;
  }
  function close() {
    effects.forEach((effect) => effect?.cleanup?.());
    observers.forEach(({ observer, unsubscribe }) => { unsubscribe(); observer.destroy(); });
    client.clear();
  }
  return { client, state, load, lifecycle, queries, render, settle, close };
}

class Channel {
  listeners = new Map(); sent = []; peers = [];
  addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(listener); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  postMessage(message) { this.sent.push(message); for (const peer of this.peers) peer.receive(message); }
  receive(data) { this.listeners.get("message")?.forEach((listener) => listener({ data })); }
}

test("overlapping transitions block synchronously, clean private data, and only reconcile after both finish", async () => {
  const h = harness(); const connection = h.lifecycle.connectRecommendationLifecycle(h.client, new Channel(), true);
  try {
    await tick();
    const options = h.queries.cartRecommendationsQueryOptions(context);
    h.client.setQueryData(options.queryKey, payload);
    const before = h.lifecycle.getRecommendationGate(h.client).generation;
    const first = h.lifecycle.beginRecommendationTransition(h.client);
    const second = h.lifecycle.beginRecommendationTransition(h.client);
    assert.equal(h.lifecycle.canReconcileRecommendations(h.lifecycle.getRecommendationGate(h.client)), false);
    await Promise.all([first.ready, second.ready]);
    assert.equal(h.client.getQueryData(options.queryKey), undefined);
    first.finish(); first.finish(); await tick();
    assert.equal(h.lifecycle.canReconcileRecommendations(h.lifecycle.getRecommendationGate(h.client)), false);
    second.finish(); await tick();
    assert.equal(h.lifecycle.canReconcileRecommendations(h.lifecycle.getRecommendationGate(h.client)), true);
    assert.equal(h.lifecycle.isRecommendationGenerationCurrent(h.client, before), false);
  } finally { connection.disconnect(); h.close(); }
});

test("generation guard rejects a late response even without query cancellation", async () => {
  const h = harness(); const connection = h.lifecycle.connectRecommendationLifecycle(h.client, new Channel(), true);
  try {
    await tick(); let finish;
    h.state.respond = () => new Promise((resolve) => { finish = resolve; });
    const generation = h.lifecycle.getRecommendationGate(h.client).generation;
    const options = h.queries.cartRecommendationsQueryOptions(context, {
      generation, current: () => h.lifecycle.isRecommendationGenerationCurrent(h.client, generation),
    });
    const pending = options.queryFn({ signal: new AbortController().signal });
    const transition = h.lifecycle.beginRecommendationTransition(h.client);
    finish(response(payload));
    await assert.rejects(pending, { code: "recommendation-context-changed" });
    await transition.ready; transition.finish();
  } finally { connection.disconnect(); h.close(); }
});

test("newer cleanup cannot reopen the gate while an older cleanup is unfinished", async () => {
  const h = harness(); const connection = h.lifecycle.connectRecommendationLifecycle(h.client, new Channel(), true);
  try {
    await tick(); const cancel = h.client.cancelQueries.bind(h.client); let release; let delayed = false;
    h.client.cancelQueries = (filters) => {
      const result = cancel(filters);
      if (!delayed && filters.queryKey[0] === "cart") {
        delayed = true;
        return result.then(() => new Promise((resolve) => { release = resolve; }));
      }
      return result;
    };
    const first = h.lifecycle.suspendRecommendationReads(h.client);
    const second = h.lifecycle.suspendRecommendationReads(h.client);
    await tick();
    assert.equal(h.lifecycle.canReconcileRecommendations(h.lifecycle.getRecommendationGate(h.client)), false);
    release(); await Promise.all([first, second]);
    assert.equal(h.lifecycle.canReconcileRecommendations(h.lifecycle.getRecommendationGate(h.client)), true);
  } finally { connection.disconnect(); h.close(); }
});

test("transition cancels a real QueryClient request and its late result cannot restore private data", async () => {
  const h = harness(); const connection = h.lifecycle.connectRecommendationLifecycle(h.client, new Channel(), true);
  try {
    await tick(); let finish;
    h.state.respond = () => new Promise((resolve) => { finish = resolve; });
    const options = h.queries.cartRecommendationsQueryOptions(context);
    const request = h.client.fetchQuery(options).catch(() => undefined);
    const operation = h.lifecycle.beginRecommendationTransition(h.client);
    await operation.ready;
    assert.equal(h.state.calls[0].signal.aborted, true);
    finish(response(payload)); await request;
    assert.equal(h.client.getQueryData(options.queryKey), undefined);
    operation.finish();
  } finally { connection.disconnect(); h.close(); }
});

test("cross-tab messages invalidate only, overlap safely, and do not accept identity claims", async () => {
  const first = harness(), second = harness(); const a = new Channel(), b = new Channel(); a.peers = [b]; b.peers = [a];
  const one = first.lifecycle.connectRecommendationLifecycle(first.client, a, true);
  const two = second.lifecycle.connectRecommendationLifecycle(second.client, b, true);
  try {
    await tick(); const operation = first.lifecycle.beginRecommendationTransition(first.client);
    await operation.ready; await tick();
    assert.equal(second.lifecycle.canReconcileRecommendations(second.lifecycle.getRecommendationGate(second.client)), false);
    const version = second.lifecycle.getRecommendationGate(second.client).generation;
    b.receive({ kind: "authenticated", accountId: "attacker" });
    assert.equal(second.lifecycle.getRecommendationGate(second.client).generation, version);
    operation.finish(); await tick();
    assert.equal(second.lifecycle.canReconcileRecommendations(second.lifecycle.getRecommendationGate(second.client)), true);
    assert.ok(a.sent.every((message) => !Object.hasOwn(message, "accountId")));
    two.setActive(false); await tick();
    assert.equal(second.lifecycle.canReconcileRecommendations(second.lifecycle.getRecommendationGate(second.client)), false);
    two.setActive(true); await tick();
    assert.ok(second.lifecycle.getRecommendationGate(second.client).generation > version);
  } finally { one.disconnect(); two.disconnect(); first.close(); second.close(); }
});

test("missing or broken cross-tab signaling stays closed without blocking commerce transitions", async () => {
  for (const channel of [null, { ...new Channel(), addEventListener() {}, removeEventListener() {}, postMessage() { throw new Error("disabled"); } }]) {
    const h = harness(); const connection = h.lifecycle.connectRecommendationLifecycle(h.client, channel, true);
    try {
      await tick(); const operation = h.lifecycle.beginRecommendationTransition(h.client);
      await operation.ready; operation.finish(); await tick();
      assert.equal(h.lifecycle.canReconcileRecommendations(h.lifecycle.getRecommendationGate(h.client)), false);
      assert.equal((await h.settle()).status, "inactive"); assert.equal(h.state.calls.length, 0);
    } finally { connection.disconnect(); h.close(); }
  }
});

test("one reconciled authenticated query supplies both rows; quantity readiness does not refetch recommendations", async () => {
  const h = harness(); const connection = h.lifecycle.connectRecommendationLifecycle(h.client, new Channel(), true);
  try {
    await tick(); const result = await h.settle();
    assert.equal(result.status, "success");
    assert.deepEqual(result.data.related, payload.related);
    assert.deepEqual(result.data.frequentlyOrderedWith, payload.frequentlyOrderedWith);
    assert.equal(h.state.calls.filter((call) => call.url.includes("/recommendations")).length, 1);
    await h.settle({ projectionReady: false }); await h.settle();
    assert.equal(h.state.calls.filter((call) => call.url.includes("/recommendations")).length, 1);
    await h.queries.invalidateCartRecommendations(h.client); await h.settle();
    assert.equal(h.state.calls.filter((call) => call.url.includes("/recommendations")).length, 2);
    const operation = h.lifecycle.beginRecommendationTransition(h.client);
    assert.equal(h.render().status, "inactive"); await operation.ready;
    operation.finish(); await tick();
    h.state.respond = async () => response(snapshot, "account-2");
    assert.equal((await h.settle()).status, "error");
  } finally { connection.disconnect(); h.close(); }
});

test("empty Cart and unresolved city contexts never fetch recommendations", async () => {
  for (const input of [{ empty: true }, { contextReady: false }, { fulfillmentCityId: null }]) {
    const h = harness(); const connection = h.lifecycle.connectRecommendationLifecycle(h.client, new Channel(), true);
    try { await tick(); assert.equal((await h.settle(input)).status, "inactive"); assert.equal(h.state.calls.length, 0); }
    finally { connection.disconnect(); h.close(); }
  }
});

test("foreground return and city changes require fresh reconciliation before results are visible", async () => {
  const h = harness(); const connection = h.lifecycle.connectRecommendationLifecycle(h.client, new Channel(), true);
  h.state.respond = async (url) => url.includes("/recommendations") ? response(payload) : response({
    ...snapshot, lines: [{ ...snapshot.lines[0], availability: { cityId: Number(new URL(url, "https://store.test").searchParams.get("cityId")) } }],
  });
  try {
    await tick(); assert.equal((await h.settle()).status, "success");
    connection.setActive(false); assert.equal(h.render().status, "inactive"); await tick();
    connection.setActive(true); assert.notEqual(h.render().status, "success"); await tick();
    assert.equal((await h.settle()).status, "success");
    assert.equal(h.state.calls.filter((call) => !call.url.includes("/recommendations")).length, 2);
    await h.settle({ contextReady: false });
    assert.notEqual(h.render({ browsingCityId: 2, fulfillmentCityId: 2 }).status, "success");
    assert.equal((await h.settle({ browsingCityId: 2, fulfillmentCityId: 2 })).status, "success");
    assert.ok(h.state.calls.some((call) => call.url.includes("cityId=2")));
  } finally { connection.disconnect(); h.close(); }
});

test("missing/mismatched account evidence and expiry fail closed at either read", async () => {
  for (const at of ["cart", "recommendations"]) for (const id of [null, "account-2", "expired"]) {
    const h = harness(); const connection = h.lifecycle.connectRecommendationLifecycle(h.client, new Channel(), true);
    h.state.respond = async (url) => {
      const isRecommendations = url.includes("/recommendations");
      const target = isRecommendations === (at === "recommendations");
      return target && id === "expired" ? new Response(null, { status: 401 }) :
        response(isRecommendations ? payload : snapshot, target ? id : "account-1");
    };
    try { await tick(); assert.equal((await h.settle()).status, "error"); }
    finally { connection.disconnect(); h.close(); }
  }
});

test("private route metadata is server validated; ordinary guest Cart reads remain unchanged", async () => {
  const h = harness();
  try {
    const cartRoute = h.load("src/app/api/cart/route").GET;
    const recommendationsRoute = h.load("src/app/api/cart/recommendations/route").GET;
    const request = (reconcile = false) => new Request("https://store.test/api/cart?locale=en&cityId=1", { headers: reconcile ? { "X-Recommendation-Reconcile": "1" } : {} });
    assert.equal((await cartRoute(request(true))).headers.get("X-Rafal-Account-Id"), "account-1");
    assert.equal((await recommendationsRoute(request())).headers.get("X-Rafal-Account-Id"), "account-1");
    h.state.user = null;
    assert.equal((await cartRoute(request())).status, 200);
    assert.equal((await cartRoute(request(true))).status, 401);
    assert.equal((await recommendationsRoute(request())).status, 401);
  } finally { h.close(); }
});

test("Cart read supplies the configured quantity limit and isolates settings failure", async () => {
  const h = harness();
  try {
    const get = h.load("src/app/api/cart/route").GET;
    const request = () => new Request("https://store.test/api/cart?locale=en");
    assert.equal((await (await get(request())).json()).maxCartItemQuantity, 7);
    h.state.settingsFail = true;
    const response = await get(request());
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.maxCartItemQuantity, null);
    assert.deepEqual(data.lines, snapshot.lines);
    const reads = h.state.settingsReads;
    assert.equal((await get(new Request("https://store.test/api/cart?locale=en&cityId=1"))).status, 200);
    assert.equal(h.state.settingsReads, reads);
  } finally { h.close(); }
});

test("Guest activation needs fresh mode evidence and preserves loading, empty, and error isolation", async () => {
  for (const condition of ["success", "empty", "missing-mode", "authenticated", "expired"]) {
    const h = harness(); const connection = h.lifecycle.connectRecommendationLifecycle(h.client, new Channel(), true);
    let release;
    h.state.respond = async (url) => {
      const recommendations = url.includes("/recommendations");
      if (!recommendations) await new Promise((resolve) => { release = resolve; });
      if (condition === "expired") return new Response(null, { status: 401 });
      const data = recommendations ? payload : condition === "empty" ? { ...snapshot, lines: [] } : snapshot;
      return Response.json(data, { headers: condition === "missing-mode" ? {} : condition === "authenticated"
        ? { "X-Rafal-Account-Id": "account-1", "X-Rafal-Cart-Mode": "authenticated" } : { "X-Rafal-Cart-Mode": "guest" } });
    };
    try {
      await tick();
      assert.equal(h.render({ accountId: null }).status, "loading");
      await tick(); release();
      const result = await h.settle({ accountId: null });
      assert.equal(result.status, condition === "success" ? "success" : condition === "empty" ? "inactive" : "error");
      assert.equal(h.state.calls.filter((call) => call.url.includes("/recommendations")).length, condition === "success" ? 1 : 0);
      assert.equal(h.state.calls[0].headers["X-Rafal-Cart-Mode"], "guest");
    } finally { connection.disconnect(); h.close(); }
  }
});

test("Guest requests cannot fall back to authenticated or tokenless identity on either private route", async () => {
  const h = harness();
  try {
    const request = () => new Request("https://store.test/api/cart?locale=en&cityId=1", {
      headers: { "X-Recommendation-Reconcile": "1", "X-Rafal-Cart-Mode": "guest" },
    });
    for (const route of ["src/app/api/cart/route", "src/app/api/cart/recommendations/route"]) {
      const get = h.load(route).GET;
      h.state.user = { id: "account-1" }; h.state.guestToken = "private-test-token";
      assert.equal((await get(request())).status, 401);
      h.state.user = null; h.state.guestToken = null;
      assert.equal((await get(request())).status, 401);
      h.state.guestToken = "private-test-token";
      const result = await get(request());
      assert.equal(result.status, 200);
      assert.equal(result.headers.get("X-Rafal-Cart-Mode"), "guest");
      assert.equal(result.headers.get("X-Rafal-Account-Id"), null);
      assert.equal(JSON.stringify([...result.headers]).includes(h.state.guestToken), false);
      assert.equal((await result.text()).includes(h.state.guestToken), false);
    }
  } finally { h.close(); }
});

test("Guest result metadata must match the reconciled mode, and quantity readiness never reselects", async () => {
  for (const mode of ["guest", "authenticated", "missing"]) {
    const h = harness(); const connection = h.lifecycle.connectRecommendationLifecycle(h.client, new Channel(), true);
    h.state.respond = async (url) => Response.json(url.includes("/recommendations") ? payload : snapshot, {
      headers: !url.includes("/recommendations") || mode === "guest" ? { "X-Rafal-Cart-Mode": "guest" } :
        mode === "authenticated" ? { "X-Rafal-Cart-Mode": "authenticated", "X-Rafal-Account-Id": "account-1" } : {},
    });
    try {
      await tick(); assert.equal((await h.settle({ accountId: null })).status, mode === "guest" ? "success" : "error");
      if (mode === "guest") {
        await h.settle({ accountId: null, projectionReady: false });
        await h.settle({ accountId: null });
        assert.equal(h.state.calls.filter((call) => call.url.includes("/recommendations")).length, 1);
      }
    } finally { connection.disconnect(); h.close(); }
  }
});

test("late Guest responses are rejected after generation changes even without transport cancellation", async () => {
  const h = harness(); const connection = h.lifecycle.connectRecommendationLifecycle(h.client, new Channel(), true);
  try {
    await tick(); let finish;
    h.state.respond = () => new Promise((resolve) => { finish = resolve; });
    const generation = h.lifecycle.getRecommendationGate(h.client).generation;
    const options = h.queries.cartRecommendationsQueryOptions({ ...context, accountId: null }, {
      generation, current: () => h.lifecycle.isRecommendationGenerationCurrent(h.client, generation),
    });
    const pending = options.queryFn({ signal: new AbortController().signal });
    const transition = h.lifecycle.beginRecommendationTransition(h.client);
    await transition.ready; transition.finish(); await tick();
    finish(Response.json(payload, { headers: { "X-Rafal-Cart-Mode": "guest" } }));
    await assert.rejects(pending, { code: "recommendation-context-changed" });
  } finally { connection.disconnect(); h.close(); }
});
