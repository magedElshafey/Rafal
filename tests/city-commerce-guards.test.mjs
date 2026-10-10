import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = (relativePath) =>
  readFileSync(path.join(root, relativePath), "utf8");

test("PDP Add uses the coordinator lock in eligibility and the mutation handler", () => {
  const purchase = source(
    "src/features/products/components/product-details/product-purchase-experience.tsx",
  );
  assert.ok(purchase.includes("useBrowsingCity()"));
  assert.match(purchase, /const canAddToCart =\s*!cityTransitionLocked &&/);
  assert.match(
    purchase,
    /const handleAddToCart[\s\S]*?if \(\s*cityTransitionLocked \|\|[\s\S]*?mutateAddToCart\(input\)/,
  );
  assert.ok(purchase.includes("<ProductPurchasePanel"));
  assert.ok(purchase.includes("<ProductStickyPurchaseActions"));
  assert.equal(
    purchase.match(/canAddToCart=\{canAddToCart\}/g)?.length,
    2,
  );
});

test("Cart projects from coordinator committed city without the legacy event", () => {
  const cartPage = source("src/features/cart/components/cart-page.tsx");
  const provider = source(
    "src/features/location/components/browsing-city-provider.tsx",
  );
  assert.ok(cartPage.includes("committedCity"));
  assert.ok(cartPage.includes("useCurrentCart(locale, browsingCityId, initialCart)"));
  assert.equal(cartPage.includes("transitionCity"), false);
  assert.equal(cartPage.includes("window.addEventListener"), false);
  assert.equal(provider.includes("notifyBrowsingCitySelected"), false);
  assert.equal(
    existsSync(path.join(root, "src/features/location/browsing-city-events.ts")),
    false,
  );
});

test("Cart write boundaries reject quantity, remove, and clear while locked", () => {
  const mutations = source(
    "src/features/cart/hooks/use-cart-page-mutations.ts",
  );
  assert.ok(mutations.includes("cityTransitionLocked"));
  assert.match(
    mutations,
    /const changeQuantity[\s\S]*?cityTransitionLocked[\s\S]*?void syncLine\(lineId\)/,
  );
  assert.match(
    mutations,
    /const removeLine[\s\S]*?cityTransitionLocked[\s\S]*?removeMutation\.mutateAsync/,
  );
  assert.match(
    mutations,
    /const clear[\s\S]*?cityTransitionLocked[\s\S]*?clearMutation\.mutateAsync/,
  );
});

test("coupon and Gift Cart writes have UI and runtime transition guards", () => {
  const coupon = source("src/features/cart/components/cart-coupon.tsx");
  const gift = source("src/features/cart/components/cart-gift.tsx");
  assert.ok(coupon.includes("writeDisabled = busy || cityTransitionLocked"));
  assert.ok(coupon.includes("if (writeDisabled) return"));
  assert.match(
    coupon,
    /if \(cityTransitionLocked\) return;[\s\S]*?removeMutation\.mutate\(\)/,
  );
  assert.ok(gift.includes("writeDisabled = busy || cityTransitionLocked"));
  assert.match(
    gift,
    /if \(cityTransitionLocked \|\| mutationInFlight\.current\) return null;/,
  );
});

test("Cart checkout requires current projection and rechecks city context after awaits", () => {
  const cartPage = source("src/features/cart/components/cart-page.tsx");
  assert.match(
    cartPage,
    /const cartFulfillable = projectionReady[\s\S]*?!cityTransitionPending[\s\S]*?!mutations\.projectionDirty/,
  );
  assert.ok(cartPage.includes("startedCheckoutContext"));
  assert.ok(cartPage.includes("useLayoutEffect"));
  assert.equal(
    cartPage.includes("useEffect(() => {\n    checkoutContextRef.current"),
    false,
  );
  assert.match(
    cartPage,
    /await mutations\.flushPendingMutations\(\)[\s\S]*?!fulfillmentIsCurrent\(\)[\s\S]*?await mutations\.refreshProjection\(\)[\s\S]*?fulfillmentIsCurrent\(\)/,
  );
  assert.match(
    cartPage,
    /disabled=\{\s*cityTransitionLocked \|\| !cartFulfillable \|\| checkoutPending/,
  );
});

test("Checkout Place is guarded without coupling quote or destination to Browsing City", () => {
  const checkout = source("src/features/checkout/components/checkout-page.tsx");
  const quote = source("src/features/checkout/hooks/use-checkout-quote.ts");
  const serializer = source(
    "src/features/checkout/api/checkout-place-serializer.ts",
  );
  assert.match(checkout, /const placeReady = Boolean\(\s*!cityTransitionLocked/);
  assert.match(
    checkout,
    /const placeOrder = async \(\) => \{[\s\S]*?cityTransitionLocked[\s\S]*?placeMutation\.mutateAsync\(placeRequest\)/,
  );
  assert.equal(quote.includes("useBrowsingCity"), false);
  assert.ok(serializer.includes("destination: input.destination"));
  assert.equal(serializer.includes("BrowsingCity"), false);
});

test("Checkout gift Cart writes share the browsing-city transition guard", () => {
  const checkout = source("src/features/checkout/components/checkout-page.tsx");
  const giftWrap = source(
    "src/features/checkout/components/checkout-gift-wrap.tsx",
  );
  const recipientEditor = source(
    "src/features/checkout/components/checkout-gift-recipient-editor.tsx",
  );
  assert.ok(
    checkout.includes(
      "giftMutationDisabled={giftAddOnPending || cityTransitionLocked}",
    ),
  );
  assert.ok(
    checkout.includes(
      "disabled={recipientGiftPending || cityTransitionLocked}",
    ),
  );
  assert.ok(
    giftWrap.includes(
      "if (!input || disabled || mutationInFlight.current) return;",
    ),
  );
  assert.ok(
    recipientEditor.includes(
      "if (!draft || mutation.isPending || disabled) return;",
    ),
  );
});

test("transition locks do not cancel already-started commerce requests", () => {
  const purchase = source(
    "src/features/products/components/product-details/product-purchase-experience.tsx",
  );
  const mutations = source(
    "src/features/cart/hooks/use-cart-page-mutations.ts",
  );
  const checkout = source("src/features/checkout/components/checkout-page.tsx");
  for (const content of [purchase, mutations, checkout]) {
    assert.equal(content.includes("AbortController"), false);
  }
  assert.equal(checkout.includes("placeMutation.cancel"), false);
});

test("the sync veil remains visual-only", () => {
  const veil = source(
    "src/features/location/components/storefront-sync-veil.tsx",
  );
  assert.ok(veil.includes("pointer-events-none"));
  assert.equal(veil.includes("inert"), false);
  assert.equal(veil.includes("onClick"), false);
});
