import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "next-intl";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, stubs = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/features/loyalty/${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(
    name => name === "server-only" ? {} : stubs[name] ?? require(name), loaded, loaded.exports,
  );
  return loaded.exports;
}
const fixture = name => JSON.parse(readFileSync(new URL(`../src/docs/reference/loyalty/fixtures/history-${name}.json`, import.meta.url), "utf8"));
const parser = load("api/parse-loyalty-history.ts");
const types = load("types/loyalty-history.types.ts");
const parse = parser.parseLoyaltyHistory;
const page = (number = 1, ids = [7], last = 3) => ({
  data: ids.map(id => ({ ...fixture("before_order").data[0], id })),
  meta: { current_page: number, last_page: last, per_page: 20, total: 60 },
});

test("real lifecycle responses retain backend classifications, signed values and nullable orders", () => {
  for (const name of ["before_order", "confirmed", "processing", "shipped", "delivered", "returned"]) {
    const payload = fixture(name);
    assert.deepEqual(parse(payload, 1), { data: payload.data, meta: payload.meta });
  }
  const rows = parse(fixture("confirmed"), 1).data;
  assert.ok(rows.some(row => row.points < 0));
  assert.ok(rows.some(row => row.order === null));
  assert.ok(rows.some(row => row.is_pending));
  for (const mutate of [p => p.success = false, p => p.data[0].points = "100", p => p.data[0].expires_at = "invalid", p => p.data[0].order = { id: 147 }, p => p.meta.per_page = 10]) {
    const payload = fixture("confirmed"); mutate(payload);
    assert.throws(() => parse(payload, 1), /Invalid Loyalty history/);
  }
});

test("empty and out-of-range pages remain distinct", () => {
  const empty = { success: true, data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } };
  assert.equal(parse(empty, 1).meta.total, 0);
  const outside = { ...empty, meta: { ...empty.meta, current_page: 2, total: 1 } };
  assert.equal(parse(outside, 2).meta.current_page, 2);
  assert.throws(() => parse(outside, 1));
});

test("all four filters use authenticated shared API, 20 rows and requested page", async () => {
  const calls = [];
  let token = "test-token";
  const api = load("api/loyalty-history-api.server.ts", {
    "@/features/auth/server/auth-session": { getAccessToken: async () => token },
    "@/lib/api/server-api": { serverApi: { request: async input => { calls.push(input); return { success: true, ...page(2) }; } } },
    "./parse-loyalty-history": parser,
  });
  for (const type of types.historyFilters) await api.getLoyaltyHistory("ar", type, 2);
  assert.deepEqual(calls.map(call => call.query), types.historyFilters.map(type => ({ type, page: 2, per_page: 20 })));
  assert.ok(calls.every(call => call.locale === "ar" && call.path === "/loyalty/history" && call.headers.Authorization === "Bearer test-token"));
  token = null;
  await assert.rejects(api.getLoyaltyHistory("en"), /authenticated session/);
  assert.equal(calls.length, 4);
});

test("server action rejects invalid input and returns safe failures", async () => {
  let calls = 0, fail = false;
  const action = load("actions/load-loyalty-history.ts", {
    "next-intl": { hasLocale: (locales, locale) => locales.includes(locale) },
    "@/i18n/routing": { routing: { locales: ["ar", "en"] } },
    "../types/loyalty-history.types": types,
    "../api/loyalty-history-api.server": { getLoyaltyHistory: async () => { calls++; if (fail) throw Error("PRIVATE"); return page(); } },
  }).loadLoyaltyHistory;
  for (const args of [["fr", "all", 1], ["en", "fake", 1], ["ar", "earn", 0], ["ar", "all", 1.5]]) assert.deepEqual(await action(...args), { ok: false });
  assert.equal(calls, 0);
  assert.equal((await action("ar", "all", 1)).ok, true);
  fail = true;
  assert.deepEqual(await action("en", "other", 2), { ok: false });
});

function harness(initial = page()) {
  const slots = [], requests = [];
  let cursor = 0;
  const hook = load("hooks/use-loyalty-history.ts", {
    react: {
      useState: initial => {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [slots[index], next => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }];
      },
      useRef: initial => { const index = cursor++; return slots[index] ??= { current: initial }; },
    },
    "../actions/load-loyalty-history": { loadLoyaltyHistory: (...args) => new Promise((resolve, reject) => requests.push({ args, resolve, reject })) },
  }).useLoyaltyHistory;
  return { requests, render: () => { cursor = 0; return hook("en", initial); } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test("Show More deduplicates, prevents repeated submissions and stops at final metadata page", async () => {
  const h = harness();
  h.render().loadMore(); h.render().loadMore();
  assert.equal(h.requests.length, 1);
  assert.deepEqual(h.requests[0].args, ["en", "all", 2]);
  h.requests[0].resolve({ ok: true, page: page(2, [7, 8], 2) }); await flush();
  assert.deepEqual(h.render().page.data.map(row => row.id), [7, 8]);
  assert.equal(h.render().hasMore, false);
  h.render().loadMore();
  assert.equal(h.requests.length, 1);
});

test("filter changes reset pagination, request every filter and ignore stale responses", async () => {
  const h = harness();
  h.render().loadMore();
  for (const filter of ["earn", "redeem", "other", "all"]) h.render().changeFilter(filter);
  assert.equal(h.render().page, null);
  assert.ok(h.requests.slice(1).every(request => request.args[2] === 1));
  h.requests[4].resolve({ ok: true, page: page(1, [99]) }); await flush();
  h.requests[0].resolve({ ok: true, page: page(2, [88]) });
  h.requests[1].reject(Error("stale failure"));
  h.requests[2].resolve({ ok: false });
  h.requests[3].resolve({ ok: true, page: page(1, [77]) }); await flush();
  assert.deepEqual(h.render().page.data.map(row => row.id), [99]);
  assert.equal(h.render().filter, "all");
  assert.equal(h.render().error, false);
});

test("stale completion cannot unlock the latest pending filter request", async () => {
  const h = harness();
  h.render().loadMore();
  h.render().changeFilter("earn");
  h.requests[0].resolve({ ok: true, page: page(2, [88]) }); await flush();
  assert.equal(h.render().loading, true);
  assert.equal(h.render().page, null);
  h.render().changeFilter("earn");
  h.render().loadMore();
  assert.equal(h.requests.length, 2);
  h.requests[1].resolve({ ok: true, page: page(1, [99]) }); await flush();
  assert.equal(h.render().loading, false);
  assert.deepEqual(h.render().page.data.map(row => row.id), [99]);
});

test("later failures preserve entries and retry the same page; initial failure can recover", async () => {
  const h = harness();
  h.render().loadMore(); h.requests[0].resolve({ ok: false }); await flush();
  assert.deepEqual(h.render().page.data.map(row => row.id), [7]);
  assert.equal(h.render().error, true);
  h.render().loadMore();
  assert.equal(h.requests[1].args[2], 2);
  h.requests[1].resolve({ ok: true, page: page(2, [8]) }); await flush();
  assert.equal(h.render().error, false);
  const initial = harness(null);
  assert.equal(initial.render().error, true);
  initial.render().loadMore();
  assert.equal(initial.requests[0].args[2], 1);
  initial.requests[0].resolve({ ok: true, page: page(1) }); await flush();
  assert.equal(initial.render().error, false);
});

test("out-of-range metadata preserves loaded entries and offers page-one restart", async () => {
  const h = harness();
  h.render().loadMore();
  h.requests[0].resolve({ ok: true, page: { data: [], meta: { current_page: 2, last_page: 1, per_page: 20, total: 1 } } }); await flush();
  assert.equal(h.render().outOfRange, true);
  assert.equal(h.render().hasMore, false);
  assert.equal(h.render().page.data.length, 1);
  h.render().restart();
  assert.deepEqual(h.requests[1].args, ["en", "all", 1]);
});

test("AR/EN render backend labels, signed points, dates, pending, expiry and order-number links", () => {
  for (const locale of ["ar", "en"]) {
    const messages = JSON.parse(readFileSync(new URL(`../src/messages/${locale}/account.json`, import.meta.url), "utf8"));
    const t = createTranslator({ locale, messages, namespace: "loyalty.history" });
    let state = { page: parse(fixture("confirmed"), 1), filter: "all", hasMore: true, loading: false, error: false };
    const component = load("components/loyalty-history.tsx", {
      "next-intl": { useTranslations: () => t },
      "@/components/ui/button": { Button: ({ children, ...props }) => {
        delete props.loading;
        delete props.loadingLabel;
        return React.createElement("button", props, children);
      } },
      "@/components/ui/skeleton": { Skeleton: "div" },
      "@/i18n/navigation": { Link: "a" },
      "../hooks/use-loyalty-history": { useLoyaltyHistory: () => state },
      "../types/loyalty-history.types": types,
    }).LoyaltyHistory;
    const render = () => renderToStaticMarkup(React.createElement(component, { locale, initialPage: state.page }));
    let html = render();
    assert.ok(html.includes('/account/orders/RF-10147') && !html.includes('/account/orders/147'));
    assert.equal((html.match(/href=/g) ?? []).length, 2);
    assert.ok(html.includes(t("pending")) && html.includes(t("expires")));
    for (const row of state.page.data) {
      assert.ok(html.includes(row.label));
      assert.ok(html.includes(`<bdi>${new Intl.NumberFormat(locale, { signDisplay: "exceptZero" }).format(row.points)}</bdi>`));
    }
    assert.equal((html.match(/aria-pressed=/g) ?? []).length, 4);
    assert.ok(html.includes(t("showMore")));
    state = { ...state, page: null, loading: true };
    assert.ok(render().includes('aria-busy="true"'));
    state = { ...state, loading: false, error: true };
    html = render();
    assert.ok(html.includes('role="alert"') && html.includes(t("retry")) && !html.includes(t("empty")));
    state = { ...state, error: false, page: { data: [], meta: { total: 0 } } };
    assert.ok(render().includes(t("empty")));
    state = { ...state, outOfRange: true };
    assert.ok(render().includes(t("outOfRange")) && !render().includes(t("empty")));
  }
});
