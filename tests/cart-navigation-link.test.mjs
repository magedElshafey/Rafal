import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import * as reactQuery from "@tanstack/react-query";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, stubs = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(
    name => stubs[name] ?? require(name), loaded, loaded.exports,
  );
  return loaded.exports;
}
const query = load("src/features/cart/api/cart-query.ts", {
  "@/lib/api/api-error": { ApiError: Error },
});
const snapshot = quantity => ({ lines: [{ id: "line", quantity }], summary: { totalQuantity: quantity, lineCount: 1 } });
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

function render(queryClient, locale, mobile = false, pathname = "/") {
  const copy = JSON.parse(readFileSync(new URL(`../src/messages/${locale}/common.json`, import.meta.url), "utf8")).nav;
  const { CartNavigationLink } = load("src/features/cart/components/cart-navigation-link.tsx", {
    "@tanstack/react-query": reactQuery,
    "@/features/cart/api/cart-query": query,
    "@/components/ui/icons/interface-icons": { ShoppingBagIcon: props => React.createElement("svg", props) },
    "@/i18n/navigation": { Link: props => React.createElement("a", props), usePathname: () => pathname },
    "next-intl": { useLocale: () => locale, useTranslations: () => (key, values) => copy[key].replace("{count}", values?.count ?? "") },
  });
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: queryClient },
    React.createElement(CartNavigationLink, { className: "existing-shell-spacing", mobile })));
}

test("both shell variants expose the full localized quantity and cap only the visual badge", () => {
  for (const locale of ["ar", "en"]) for (const mobile of [false, true]) {
    const cache = client();
    for (const count of [0, 1, 9, 10, 1234]) {
      cache.setQueryData(query.currentCartQueryKey(locale, null), snapshot(count));
      const html = render(cache, locale, mobile, "/cart");
      const number = new Intl.NumberFormat(locale);
      assert.match(html, /href="\/cart"/);
      assert.match(html, /aria-current="page"/);
      assert.ok(html.includes(`: ${number.format(count)}"`));
      assert.equal(html.includes('<bdi dir="ltr">'), count > 0);
      if (count > 0) assert.ok(html.includes(`<bdi dir="ltr">${number.format(Math.min(count, 9))}${count > 9 ? "+" : ""}</bdi>`));
      if (count > 0) {
        const badge = html.match(/class="([^"]*bg-gold-500[^"]*)"/)?.[1];
        assert.ok(badge?.includes("bottom-full -mb-0.5"));
        assert.ok(badge?.includes("-end-2") && badge.includes("text-gray-0"));
        assert.ok(!badge.includes("ring-") && !badge.includes("border"));
      }
      if (mobile) assert.ok(html.includes(locale === "ar" ? "السلة</span>" : "Cart</span>"));
    }
    cache.clear();
  }
});

test("unknown initial count is not announced as zero; canonical writes, rollback, merge and removal are reflected", () => {
  const cache = client();
  assert.match(render(cache, "en"), /aria-label="Shopping cart"/);
  assert.ok(!render(cache, "en").includes("<bdi"));
  for (const quantity of [2, 7, 2, 12, 0]) {
    query.setCurrentCartQueryData(cache, "en", snapshot(quantity));
    assert.ok(render(cache, "en").includes(`item count: ${quantity}"`));
  }
  query.removeCurrentCartQueries(cache);
  assert.match(render(cache, "en"), /aria-label="Shopping cart"/);
  cache.clear();
});

test("desktop and mobile observers deduplicate the existing Cart read and reuse fresh cache", async () => {
  const cache = client();
  const originalFetch = globalThis.fetch;
  let reads = 0;
  globalThis.fetch = async url => {
    assert.equal(url, "/api/cart?locale=en");
    reads++;
    return { ok: true, json: async () => snapshot(5) };
  };
  const options = query.currentCartQueryOptions("en", null);
  const desktop = new QueryObserver(cache, options);
  const mobile = new QueryObserver(cache, options);
  const stopDesktop = desktop.subscribe(() => {});
  const stopMobile = mobile.subscribe(() => {});
  try {
    await cache.fetchQuery(options);
    assert.equal(reads, 1);
    assert.equal(desktop.getCurrentResult().data.summary.totalQuantity, 5);
    assert.equal(mobile.getCurrentResult().data.summary.totalQuantity, 5);
    await cache.fetchQuery(options);
    assert.equal(reads, 1);
    query.setCurrentCartQueryData(cache, "en", snapshot(8));
    assert.equal(desktop.getCurrentResult().data.summary.totalQuantity, 8);
    assert.equal(mobile.getCurrentResult().data.summary.totalQuantity, 8);
    assert.equal(reads, 1);
  } finally {
    stopDesktop(); stopMobile(); cache.clear(); globalThis.fetch = originalFetch;
  }
});
