import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
const require = createRequire(import.meta.url);

// Real action, boundary, request serializer and response parser; only private
// identity/location and the HTTP adapter are synthetic. No environment or network.
function harness() {
  const modules = new Map(), requests = [];
  const state = { error: null };
  function load(relative) {
    const base = path.resolve(relative), file = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    if (modules.has(file)) return modules.get(file).exports;
    const loaded = { exports: {} }; modules.set(file, loaded);
    const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
    const localRequire = name => {
      if (name === "server-only") return {};
      if (name === "next-intl") return { hasLocale: (locales, locale) => locales.includes(locale) };
      if (name === "@/i18n/routing") return { routing: { locales: ["ar", "en"] } };
      if (name === "@/features/auth/server/auth-session") return { getAccessToken: async () => null };
      if (name === "@/features/cart/server/cart-auth-context") return { resolveCartTransportIdentity: async () => ({ kind: "guest", token: "synthetic" }) };
      if (name === "@/features/cart/server/guest-cart-session") return { GuestCartSessionError: class extends Error {}, persistGuestCartToken: async () => {}, deleteGuestCartToken: async () => {} };
      if (name === "@/features/location/server/guest-city-session") return { readGuestCityId: async () => 7 };
      if (name === "@/features/cart/server/cart-add-diagnostics") return { createCartAddDiagnostics: () => ({ stage() {}, failure() {} }), getCartAddResponseFacts: () => ({}) };
      if (name === "@/lib/api/server-api") return { serverApi: { request: async request => {
        requests.push(request); if (state.error) throw state.error;
        const { quantity, product_variant_id, personalization_text, personalization_language } = request.body;
        return { success: true, message: "Synthetic cart", data: {
          items_count: quantity, lines_count: 1,
          items: [{ id: 91, quantity, personalization: personalization_text === undefined ? null : { text: personalization_text, language: personalization_language },
            product: { id: 33, slug: "synthetic", name: "Synthetic", image: null, personalizable: personalization_text !== undefined },
            variant: { id: product_variant_id, sku: "SYNTHETIC", attributes: {} }, stock: { status: "ok", available: 20 },
            unit_regular_price: "30.00", unit_price: "30.00", discount_active: false, personalization_fee: "5.00", line_total: "99.00" }],
          totals: { lines: [], items_count: quantity, lines_count: 1, subtotal: "90.00", product_discount_total: "0.00", personalization_total: "15.00", coupon_discount: "6.00", gift_wrap_fee: "0.00", shipping_fee: null,
            free_shipping: { enabled: false, threshold: null, qualifies: false, remaining: null }, total: "99.00", vat: { rate: "15", included_amount: "12.91" }, currency: "SAR" },
          coupon: null, gift: { is_gift: false, is_anonymous: false, gift_message: null, gift_wrap: false, recipient: null },
        } };
      } } };
      if (name.startsWith("@/")) return load(`src/${name.slice(2)}`);
      if (name.startsWith(".")) return load(path.resolve(path.dirname(file), name));
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(localRequire, loaded, loaded.exports);
    return loaded.exports;
  }
  return { load, requests, state, add: load("src/features/cart/actions/add-cart-line").addCartLine };
}

test("API metadata through validation and the real Add action serializes exact variant, quantity and both supported languages", async () => {
  for (const [code, language] of [["ar", "arabic"], ["en", "english"]]) {
    const h = harness();
    const raw = JSON.parse(readFileSync("tests/fixtures/product-33.json", "utf8")).data;
    Object.assign(raw, { is_personalizable: true, personalization_max_length: 20, personalization_languages: [code] });
    raw.variants = [raw.variants[0]]; raw.variants[0].attributes = {};
    const parsed = h.load("src/features/products/api/parse-product-dto").parseProductDto(raw);
    const product = h.load("src/features/products/api/product-mappers").mapProductDtoToProductDetails(parsed);
    const data = h.load("src/features/products/utils/quick-add-selection").projectQuickAddSelectionData(product, { id: 7, name: "City" }, { [product.variants[0].id]: { status: "available", maxOrderQuantity: 5 } });
    const variant = h.load("src/features/products/utils/product-variant-resolver").resolveProductVariant(data.product.variants, {});
    const personalization = { language: data.product.personalization.allowedLanguages[0], text: "  123! 🙂 هدية  " };
    assert.equal(personalization.language, language);
    assert.equal(h.load("src/features/products/utils/validate-product-personalization").validateProductPersonalization(data.product.personalization, personalization).valid, true);
    const result = await h.add({ productId: data.product.id, variantId: variant.id, quantity: 3, personalization }, "en");
    assert.equal(result.ok, true); assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].path, "/cart/items"); assert.equal(h.requests[0].method, "POST");
    assert.equal(h.requests[0].headers["Accept-Language"], "en");
    assert.deepEqual(h.requests[0].body, { product_variant_id: Number(variant.id), city_id: 7, quantity: 3, personalization_text: personalization.text, personalization_language: code });
    assert.equal(result.cart.lines[0].product.id, data.product.id);
    assert.equal(result.cart.lines[0].variant.id, variant.id);
    assert.equal(result.cart.summary.total.amount, "99.00");
  }
});

test("ordinary Add omits personalization; unsupported transport language never reaches Laravel", async () => {
  const h = harness();
  assert.equal((await h.add({ productId: "33", variantId: "54", quantity: 2 }, "ar")).ok, true);
  assert.deepEqual(h.requests[0].body, { product_variant_id: 54, city_id: 7, quantity: 2 });
  const result = await h.add({ productId: "33", variantId: "54", quantity: 2, personalization: { language: "fr", text: "Name" } }, "ar");
  assert.equal(result.error.code, "invalid-input"); assert.equal(h.requests.length, 1);
});

test("real action maps backend validation and uncertain transport errors without retrying", async () => {
  for (const status of [422, 503]) {
    const h = harness(); const { ApiError } = h.load("src/lib/api/api-error");
    h.state.error = new ApiError({ status, message: "Synthetic rejection", details: { personalization_text: ["Synthetic validation"] } });
    const result = await h.add({ productId: "33", variantId: "54", quantity: 1, personalization: { language: "english", text: "123!" } }, "en");
    assert.equal(result.ok, false); assert.equal(result.error.code, status === 422 ? "invalid-personalization" : "service-unavailable");
    assert.equal(h.requests.length, 1);
  }
});

test("frontend length is consistently UTF-16 without normalizing combining marks or emoji", () => {
  const h = harness(); const validate = h.load("src/features/products/utils/validate-product-personalization").validateProductPersonalization;
  const config = { enabled: true, maxLength: 2, allowedLanguages: ["english"] };
  for (const text of ["🙂", "e\u0301", "12", "!?", "هد"]) assert.equal(validate(config, { language: "english", text }).valid, true);
  assert.equal(validate(config, { language: "english", text: "🙂a" }).error.actualLength, 3);
  assert.equal(validate(config, { language: "english", text: "   " }).error.code, "required");
});
