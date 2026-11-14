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
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(
    name => name === "server-only" ? {} : stubs[name] ?? require(name), loaded, loaded.exports,
  );
  return loaded.exports;
}
const fixture = name => JSON.parse(readFileSync(new URL(`../src/docs/reference/loyalty/fixtures/loyalty-${name}.json`, import.meta.url), "utf8"));
const parser = load("src/features/loyalty/api/parse-loyalty-summary.ts");
const parse = parser.parseLoyaltySummary;
const translator = locale => createTranslator({ locale, namespace: "loyalty", messages: JSON.parse(readFileSync(new URL(`../src/messages/${locale}/account.json`, import.meta.url), "utf8")) });
const summaryModule = load("src/features/loyalty/components/loyalty-summary.tsx", {
  "next-intl/server": { getTranslations: async ({ locale }) => translator(locale) },
  "@/components/ui/icons/interface-icons": { CrownIcon: "svg", InfoIcon: "svg" },
});
async function render(data, locale = "en") {
  return renderToStaticMarkup(await summaryModule.LoyaltySummary({ summary: parse(data), locale }));
}

test("all supplied summary lifecycle fixtures retain backend money, points and null dates", () => {
  for (const name of ["before_order", "confirmed", "processing", "shipped", "delivered", "returned"]) {
    const payload = fixture(name), summary = parse(payload);
    assert.equal(summary.available, payload.data.available);
    assert.equal(summary.valueSar, payload.data.value_sar);
    assert.equal(summary.pending, payload.data.pending);
    assert.equal(summary.pendingAvailableOn, payload.data.pending_available_on);
    assert.equal(summary.isPaused, payload.data.is_paused);
  }
});

test("failed envelopes and missing/malformed consumed fields never become zero", () => {
  for (const mutate of [p => { p.success = false; }, p => { delete p.data.value_sar; },
    p => { p.data.value_sar = null; }, p => { p.data.value_sar = ""; }, p => { p.data.value_sar = "NaN"; },
    p => { p.data.available = "100"; }, p => { delete p.data.pending; }, p => { p.data.is_paused = "false"; },
    p => { p.data.pending_available_on = "invalid"; }, p => { delete p.data.how_it_works.redeem_amount; },
    p => { p.data.expiring_soon = { points: 1 }; }]) {
    const payload = fixture("before_order"); mutate(payload);
    assert.throws(() => parse(payload), /Invalid Loyalty summary response/);
  }
});

test("real zero balance, pending date, expiry and SAR value render in AR/EN", async () => {
  for (const locale of ["ar", "en"]) {
    const t = translator(locale), number = new Intl.NumberFormat(locale);
    const empty = fixture("before_order"); empty.data.available = 0; empty.data.value_sar = "0.00";
    assert.ok((await render(empty, locale)).includes(`<bdi>${number.format(0)}</bdi>`));
    const payload = fixture("delivered");
    // Synthetic expiry edge case using the supplied timestamp shape.
    payload.data.expiring_soon = { points: 100, expires_at: "2026-11-21T21:29:08+03:00" };
    const html = await render(payload, locale);
    assert.ok(html.includes(`<bdi>${number.format(2088)}</bdi>`));
    assert.ok(html.includes('dateTime="2026-11-29T14:12:51+03:00"'));
    assert.ok(html.includes('dateTime="2026-11-21T21:29:08+03:00"'));
    assert.ok(html.includes(t("balance.description")));
    const funded = fixture("before_order"); funded.data.value_sar = "17.25";
    const formatted = new Intl.NumberFormat(locale, { style: "currency", currency: "SAR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(17.25);
    assert.ok((await render(funded, locale)).includes(formatted));
    assert.ok(!(await render(fixture("confirmed"), locale)).includes("<time"));
  }
});

test("negative and paused flags retain actual balance; paused hides rules; both notices coexist", async () => {
  for (const locale of ["ar", "en"]) {
    const payload = fixture("before_order");
    payload.data.available = -20; payload.data.value_sar = "-1.00"; payload.data.is_negative = true;
    const t = translator(locale);
    let html = await render(payload, locale);
    assert.ok(html.includes(`<bdi>${new Intl.NumberFormat(locale).format(-20)}</bdi>`));
    assert.ok(html.includes(t("negative")));
    assert.ok(html.includes(t("howItWorks.title")));
    payload.data.is_paused = true;
    html = await render(payload, locale);
    assert.ok(html.includes(t("paused")) && html.includes(t("negative")));
    assert.ok(!html.includes("loyalty-explanation-title"));
    assert.ok(html.includes("loyalty-balance-title"));
  }
});

test("rules use current settings; explicit null validity differs from missing validity", async () => {
  const payload = fixture("before_order");
  Object.assign(payload.data.how_it_works, { amount_per_point: "11.00", redeem_points: 250, redeem_amount: "12.50", max_redeem_percent: 35, min_redeem_points: 150, return_window_days: 21, validity_months: 6 });
  let html = await render(payload);
  for (const value of ["11.00", "250", "12.50", "35%", "150", "21-day", "6 months"]) assert.ok(html.includes(value));
  payload.data.how_it_works.validity_months = null;
  assert.ok((await render(payload)).includes("Points do not expire."));
  delete payload.data.how_it_works.validity_months;
  html = await render(payload);
  assert.ok(!html.includes("Points do not expire.") && !html.includes("Points are valid for"));
});

test("server read keeps credentials server-side, uses one shared API request, and propagates failures", async () => {
  const calls = [];
  let token = "synthetic-token", failAuth = false, failRequest = false;
  const api = load("src/features/loyalty/api/loyalty-api.server.ts", {
    "@/features/auth/server/auth-boundary": { requireUser: async (...args) => { calls.push(["auth", ...args]); if (failAuth) throw new Error("sign-in redirect"); } },
    "@/features/auth/server/auth-session": { getAccessToken: async () => token },
    "@/features/loyalty/api/parse-loyalty-summary": parser,
    "@/lib/api/server-api": { serverApi: { request: async input => { calls.push(["request", input]); if (failRequest) throw new Error("upstream unavailable"); return fixture("before_order"); } } },
  });
  assert.equal((await api.getLoyaltySummary("ar")).valueSar, "5.00");
  assert.deepEqual(calls, [["auth", "/account/loyalty", "ar"], ["request", { locale: "ar", path: "/loyalty", method: "GET", headers: { Authorization: "Bearer synthetic-token" } }]]);
  calls.length = 0; token = null;
  await assert.rejects(api.getLoyaltySummary("en"), /authenticated session/);
  assert.equal(calls.length, 1);
  token = "synthetic-token"; failAuth = true;
  await assert.rejects(api.getLoyaltySummary("en"), /sign-in redirect/);
  failAuth = false; failRequest = true;
  await assert.rejects(api.getLoyaltySummary("en"), /upstream unavailable/);
});

test("page reads real summary and history once without mock fallbacks", async () => {
  const summary = parse(fixture("before_order"));
  const history = { data: [{ id: 7 }], meta: { total: 1 } };
  let summaryCalls = 0, historyCalls = 0, failHistory = false;
  const page = load("src/app/[locale]/(storefront)/account/loyalty/page.tsx", {
    "next-intl/server": { getLocale: async () => "en", getTranslations: async () => translator("en") },
    "@/features/loyalty/api/loyalty-api.server": { getLoyaltySummary: async () => { summaryCalls++; return summary; } },
    "@/features/loyalty/api/loyalty-history-api.server": { getLoyaltyHistory: async () => { historyCalls++; if (failHistory) throw Error("private"); return history; } },
    "@/features/loyalty/components/loyalty-summary": { LoyaltySummary: "summary-view" },
    "@/features/loyalty/components/loyalty-history": { LoyaltyHistory: "history-view" },
  });
  const tree = await page.default();
  const children = React.Children.toArray(React.Children.toArray(tree.props.children)[1].props.children);
  assert.equal(children[0].props.summary, summary);
  assert.equal(children[1].props.initialPage, history);
  assert.equal(summaryCalls, 1);
  assert.equal(historyCalls, 1);
  failHistory = true;
  const failed = await page.default();
  const failedChildren = React.Children.toArray(React.Children.toArray(failed.props.children)[1].props.children);
  assert.equal(failedChildren[0].props.summary, summary);
  assert.equal(failedChildren[1].props.initialPage, null);
});

test("loading stays server-rendered and retry calls the framework handler without exposing errors", async () => {
  const t = translator("en");
  const loading = load("src/app/[locale]/(storefront)/account/loyalty/loading.tsx", {
    "next-intl/server": { getTranslations: async () => t },
    "@/components/ui/skeleton": { Skeleton: props => React.createElement("div", { ...props, "aria-hidden": true }) },
  });
  const html = renderToStaticMarkup(await loading.default());
  assert.ok(html.includes('aria-busy="true"') && html.includes(t("loading")));
  let retries = 0;
  const error = load("src/app/[locale]/(storefront)/account/loyalty/error.tsx", {
    "next-intl": { useTranslations: () => t },
    "@/components/ui/button": { Button: "button" },
    "@/components/ui/error-state": { ErrorState: "error-state" },
  }).default({ error: new Error("PRIVATE BACKEND ERROR"), retry: () => retries++ });
  const state = React.Children.toArray(error.props.children)[1];
  assert.equal(state.props.role, "alert");
  assert.equal(state.props.description, t("error.description"));
  state.props.action.props.onClick();
  assert.equal(retries, 1);
  assert.ok(!JSON.stringify(error).includes("PRIVATE BACKEND ERROR"));
});
