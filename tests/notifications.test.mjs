import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createTranslator } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function load(path, stubs = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mod = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name => name === "server-only" ? {} : stubs[name] ?? require(name), mod, mod.exports);
  return mod.exports;
}
const parser = load("src/features/notifications/api/parse-notifications.ts");
const fixture = JSON.parse(readFileSync(new URL("../src/docs/reference/loyalty/fixtures/notifications-empty.json", import.meta.url), "utf8"));

test("verified empty envelope; unknown rows and out-of-range pages never fabricate an empty inbox", () => {
  assert.equal(parser.parseNotifications(fixture), "empty");
  assert.equal(parser.parseNotifications({ ...fixture, data: [{}], meta: { ...fixture.meta, total: 1 } }), "unavailable");
  assert.equal(parser.parseNotifications({ ...fixture, meta: { ...fixture.meta, current_page: 2 } }), "unavailable");
  for (const payload of [null, {}, { ...fixture, success: false }, { ...fixture, meta: null }, { ...fixture, meta: { ...fixture.meta, total: -1 } }]) {
    assert.throws(() => parser.parseNotifications(payload));
  }
});

test("authenticated direct server read keeps credentials private and propagates failures", async () => {
  const calls = []; let token = "test-only-token"; let reject = false;
  const api = load("src/features/notifications/api/notifications-api.server.ts", {
    "./parse-notifications": parser,
    "@/features/auth/server/auth-boundary": { requireUser: async (...args) => calls.push(args) },
    "@/features/auth/server/auth-session": { getAccessToken: async () => token },
    "@/lib/api/server-api": { serverApi: { request: async request => { calls.push(request); if (reject) throw new Error("private failure"); return fixture; } } },
  });
  assert.equal(await api.getNotifications("en"), "empty");
  assert.deepEqual(calls[0], ["/notifications", "en"]);
  assert.equal(calls[1].path, "/notifications");
  assert.equal(calls[1].headers.Authorization, "Bearer test-only-token");
  reject = true;
  await assert.rejects(api.getNotifications("ar"));
  token = null; const count = calls.length;
  await assert.rejects(api.getNotifications("ar"));
  assert.equal(calls.length, count + 1);
});

test("AR/EN page, loading and retry states use localized semantic output without counters or invented actions", async () => {
  for (const locale of ["ar", "en"]) {
    const t = createTranslator({ locale, namespace: "notificationInbox", messages: JSON.parse(readFileSync(new URL(`../src/messages/${locale}/common.json`, import.meta.url), "utf8")) });
    const stubs = {
      "next-intl/server": { getLocale: async () => locale, getTranslations: async () => t },
      "next-intl": { useTranslations: () => t },
      "@/components/ui/container": { Container: "div" },
      "@/components/ui/skeleton": { Skeleton: "span" },
      "@/components/ui/button": { Button: "button" },
      "@/features/notifications/api/notifications-api.server": { getNotifications: async () => "empty" },
    };
    const base = "src/app/[locale]/(storefront)/notifications/";
    const html = renderToStaticMarkup(await load(base + "page.tsx", stubs).default());
    assert.ok(html.includes(t("empty")) && html.includes('role="status"'));
    assert.ok(!html.includes("<button"));
    assert.ok(renderToStaticMarkup(await load(base + "loading.tsx", stubs).default()).includes('aria-busy="true"'));
    let retries = 0;
    const error = load(base + "error.tsx", stubs).default({ retry: () => retries++ });
    error.props.children[1].props.children[1].props.onClick();
    assert.equal(retries, 1);
    assert.ok(renderToStaticMarkup(error).includes(t("retry")));
  }
});
