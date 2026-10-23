import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import { QueryClient } from "@tanstack/react-query";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const fixture = JSON.parse(readFileSync(new URL("./fixtures/product-33.json", import.meta.url), "utf8")).data;
const product = (id = 33) => ({ ...structuredClone(fixture), id, category: { id: 1, name: "Category", slug: "category" } });
const pdp = (data = []) => ({ success: true, message: "OK", data });
const cart = (first = [], related = []) => pdp({ frequently_ordered_with: first, related });

function harness() {
  const modules = new Map();
  const state = { user: { id: "account-1" }, accessToken: null, guestToken: null, calls: [], respond: async () => Response.json(cart()) };
  function load(relativePath) {
    const base = path.join(root, relativePath);
    const filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    assert.ok(filename, relativePath);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loaded = { exports: {} };
    modules.set(filename, loaded);
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    });
    const localRequire = (specifier) => {
      if (specifier === "server-only") return {};
      if (specifier === "@/features/auth/server/auth-boundary") return { getCurrentUser: async () => state.user };
      if (specifier === "@/features/auth/server/auth-session") return { getAccessToken: async () => state.accessToken };
      if (specifier === "@/features/cart/server/guest-cart-session") return { getGuestCartToken: async () => state.guestToken };
      if (specifier === "@/config/server-env") return { serverEnv: { apiBaseUrl: new URL("https://backend.test/api/v1") } };
      if (specifier.startsWith("@/")) return load(`src/${specifier.slice(2)}`);
      if (specifier.startsWith(".")) return load(path.relative(root, path.resolve(path.dirname(filename), specifier)));
      return require(specifier);
    };
    vm.runInThisContext(`(function(require,module,exports,fetch){${outputText}\n})`, { filename })(
      localRequire, loaded, loaded.exports, async (url, init) => {
        state.calls.push({ url: String(url), ...init });
        return state.respond(url, init);
      },
    );
    return loaded.exports;
  }
  return { load, state };
}

test("non-paginated PDP and Cart envelopes accept full resources and valid empty collections", () => {
  const { load } = harness();
  const { parseProductRecommendationsResponse: parsePdp } = load("src/features/products/api/parse-product-dto");
  const { parseCartRecommendationsResponse: parseCart } = load("src/features/cart/api/parse-cart-recommendations");
  assert.deepEqual(parsePdp(pdp()).data, []);
  assert.deepEqual(parseCart(cart()).data, { frequently_ordered_with: [], related: [] });
  assert.equal(parsePdp(pdp([product()])).data[0].id, 33);
  assert.equal(parseCart(cart([product(8)], [product(9)])).data.related[0].id, 9);
});

test("malformed envelopes and either missing/wrong Cart collection reject instead of becoming empty", () => {
  const { load } = harness();
  const { parseProductRecommendationsResponse: parsePdp, ProductContractError } = load("src/features/products/api/parse-product-dto");
  const { parseCartRecommendationsResponse: parseCart } = load("src/features/cart/api/parse-cart-recommendations");
  const { CartContractError } = load("src/features/cart/api/parse-cart-dto");
  for (const value of [null, [], {}, pdp(null), pdp({}), { ...pdp(), success: "true" }, { ...pdp(), message: null }]) {
    assert.throws(() => parsePdp(value), ProductContractError);
  }
  for (const value of [null, [], {}, pdp(null), pdp([]), { ...cart(), success: 1 }, { ...cart(), message: null }]) {
    assert.throws(() => parseCart(value), CartContractError);
  }
  for (const field of ["frequently_ordered_with", "related"]) {
    for (const invalid of [undefined, null, {}, "products", 1]) {
      const response = cart();
      response.data[field] = invalid;
      assert.throws(() => parseCart(response), CartContractError);
    }
  }
  for (const parse of [parsePdp, (value) => parseCart(cart(value.data))]) {
    assert.throws(() => parse(pdp([{ ...product(), id: "invalid" }])), ProductContractError);
  }
});

test("existing mapper preserves backend order and duplicates, with existing nullable projection policy", () => {
  const { load } = harness();
  const { parseProductRecommendationsResponse } = load("src/features/products/api/parse-product-dto");
  const { mapRecommendationProducts, mapProductDtoToListingProduct } = load("src/features/products/api/product-mappers");
  const products = parseProductRecommendationsResponse(pdp([product(33), product(11), product(33)])).data;
  const mapped = mapRecommendationProducts(products);
  assert.deepEqual(mapped, products.map(mapProductDtoToListingProduct));
  assert.equal(mapped.length, 3);
  assert.deepEqual(mapRecommendationProducts([{ ...products[0], category: null }]), []);
  const malformedVariant = product();
  malformedVariant.variants.push({ id: "invalid" });
  assert.equal(parseProductRecommendationsResponse(pdp([malformedVariant])).data[0].variants.length, fixture.variants.length);
});

test("PDP uses encoded slug, locale headers, optional-auth fallback and no city query", async () => {
  const { load, state } = harness();
  state.accessToken = "test-access";
  state.respond = async () => state.calls.length === 1
    ? Response.json({ message: "Unauthorized" }, { status: 401 }) : Response.json(pdp([product()]));
  const { getRelatedProducts } = load("src/features/products/server/related-products-boundary");
  const result = await getRelatedProducts("a/b", "en", new AbortController().signal);
  assert.equal(result.length, 1);
  assert.equal(state.calls.length, 2);
  for (const call of state.calls) {
    assert.equal(call.url, "https://backend.test/api/v1/products/a%2Fb/related");
    assert.equal(new Headers(call.headers).get("X-Locale"), "en");
    assert.equal(new Headers(call.headers).get("Accept-Language"), "en");
    assert.ok(call.signal instanceof AbortSignal);
  }
  assert.equal(new Headers(state.calls[0].headers).get("Authorization"), "Bearer test-access");
  assert.equal(new Headers(state.calls[1].headers).get("Authorization"), null);
});

test("Cart resolves guest/auth/tokenless identity through existing private transport and maps both arrays", async () => {
  const { load, state } = harness();
  const { getCartRecommendations } = load("src/features/cart/server/cart-recommendations-boundary");
  const { parseProductDto } = load("src/features/products/api/parse-product-dto");
  const { mapProductDtoToListingProduct } = load("src/features/products/api/product-mappers");
  state.respond = async () => Response.json(cart([product(9), product(8)], [product(7)]));
  for (const identity of [{ accessToken: null, guestToken: "test-guest" }, { accessToken: "test-auth", guestToken: "test-guest" }, { accessToken: null, guestToken: null }]) {
    Object.assign(state, identity);
    const result = await getCartRecommendations("ar");
    assert.deepEqual(result, {
      frequentlyOrderedWith: [9, 8].map((id) => mapProductDtoToListingProduct(parseProductDto(product(id)))),
      related: [mapProductDtoToListingProduct(parseProductDto(product(7)))],
    });
    const call = state.calls.at(-1);
    assert.equal(call.url, "https://backend.test/api/v1/cart/recommendations");
    const headers = new Headers(call.headers);
    assert.equal(headers.get("Authorization"), identity.accessToken ? "Bearer test-auth" : null);
    assert.equal(headers.get("X-Cart-Token"), identity.accessToken ? null : identity.guestToken);
    assert.equal(headers.get("X-Locale"), "ar");
    assert.equal(headers.get("Accept-Language"), "ar");
    assert.doesNotMatch(JSON.stringify(result), /test-auth|test-guest/);
  }
});

test("boundaries distinguish empty success, unsuccessful envelope, contract errors and transport failures", async () => {
  const { load, state } = harness();
  const { ApiError } = load("src/lib/api/api-error");
  const reads = [
    [() => load("src/features/products/server/related-products-boundary").getRelatedProducts("slug", "ar"), pdp(), []],
    [() => load("src/features/cart/server/cart-recommendations-boundary").getCartRecommendations("ar"), cart(), { frequentlyOrderedWith: [], related: [] }],
  ];
  for (const [read, envelope, empty] of reads) {
    state.respond = async () => Response.json(envelope);
    assert.deepEqual(await read(), empty);
    state.respond = async () => Response.json({ ...envelope, success: false });
    await assert.rejects(read, ApiError);
    state.respond = async () => Response.json({ ...envelope, data: null });
    await assert.rejects(read, (error) => error.name.endsWith("ContractError"));
    state.respond = async () => Response.json({ message: "Internal secret" }, { status: 403 });
    await assert.rejects(read, (error) => error instanceof ApiError && error.status === 403);
  }
});

test("private route rejects invalid locale, returns no-store data, and hides contract/backend failures", async () => {
  const { load, state } = harness();
  const { GET } = load("src/app/api/cart/recommendations/route");
  const request = (locale) => new Request(`https://store.test/api/cart/recommendations?locale=${locale}`);
  assert.equal((await GET(request("fr"))).status, 400);
  assert.equal(state.calls.length, 0);
  let response = await GET(request("ar"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(await response.json(), { frequentlyOrderedWith: [], related: [] });
  for (const respond of [async () => Response.json({ secret: "database details" }), async () => Response.json({ message: "database details" }, { status: 403 })]) {
    state.respond = respond;
    response = await GET(request("en"));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.deepEqual(await response.json(), { code: "recommendations-unavailable" });
  }
});

test("one query returns both collections; public context keys isolate account, locale and cities", async () => {
  const { load, state } = harness();
  const query = load("src/features/cart/api/cart-recommendations-query");
  const context = { accountId: "account-1", locale: "ar", browsingCityId: 1, fulfillmentCityId: 2 };
  const client = new QueryClient();
  try {
    const payload = { frequentlyOrderedWith: [], related: [] };
    state.respond = async () => Response.json(payload, { headers: { "X-Rafal-Account-Id": "account-1" } });
    const options = query.cartRecommendationsQueryOptions(context);
    assert.deepEqual(await client.fetchQuery(options), payload);
    assert.equal(state.calls.length, 1);
    assert.equal(state.calls[0].url, "/api/cart/recommendations?locale=ar");
    assert.equal(state.calls[0].credentials, "same-origin");
    assert.equal(state.calls[0].cache, "no-store");
    for (const change of [{ accountId: "account-2" }, { locale: "en" }, { browsingCityId: 3 }, { fulfillmentCityId: 4 }]) {
      assert.equal(client.getQueryData(query.cartRecommendationsQueryKey({ ...context, ...change })), undefined);
    }
    client.setQueryData(["cart", "current", "ar", null], { lines: [] });
    const { setCurrentCartQueryData } = load("src/features/cart/api/cart-query");
    setCurrentCartQueryData(client, "ar", { lines: [] });
    assert.equal(client.getQueryState(options.queryKey).isInvalidated, false);
    assert.equal(state.calls.length, 1);
    await query.invalidateCartRecommendations(client);
    assert.equal(client.getQueryState(options.queryKey).isInvalidated, true);
    assert.equal(client.getQueryState(["cart", "current", "ar", null]).isInvalidated, false);
    await query.removeCartRecommendations(client);
    assert.equal(client.getQueryData(options.queryKey), undefined);
    assert.deepEqual(client.getQueryData(["cart", "current", "ar", null]), { lines: [] });
    state.respond = async () => Response.json({ code: "recommendations-unavailable" }, { status: 503 });
    await assert.rejects(() => client.fetchQuery(options), { status: 503 });
  } finally { client.clear(); }
});

test("removal cancels in-flight recommendations and prevents a late result from restoring old data", async () => {
  const { load, state } = harness();
  const query = load("src/features/cart/api/cart-recommendations-query");
  const client = new QueryClient();
  const options = query.cartRecommendationsQueryOptions({ accountId: "account-1", locale: "ar", browsingCityId: null, fulfillmentCityId: null });
  let finish;
  state.respond = () => new Promise((resolve) => { finish = resolve; });
  try {
    const pending = client.fetchQuery(options).catch(() => undefined);
    await query.removeCartRecommendations(client);
    assert.equal(state.calls[0].signal.aborted, true);
    finish(Response.json({ frequentlyOrderedWith: [], related: [] }, { headers: { "X-Rafal-Account-Id": "account-1" } }));
    await pending;
    assert.equal(client.getQueryData(options.queryKey), undefined);
  } finally { client.clear(); }
});
