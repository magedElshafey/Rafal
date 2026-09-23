import "server-only";

import type { Locale } from "next-intl";

import { serverEnv } from "@/config/server-env";
import {
  addCartItemDto,
  clearCartDto,
  getCartDto,
  removeCartItemDto,
  updateCartItemDto,
  type CartTransportIdentity,
} from "@/features/cart/api/cart-api.server";
import { mapCartData } from "@/features/cart/api/cart-mapper";
import type { CartResponseDto } from "@/features/cart/api/cart-dto";
import { resolveCartTransportIdentity } from "@/features/cart/server/cart-auth-context";
import {
  createMockGuestCartSessionId,
  deleteGuestCartToken,
  deleteMockGuestCartSessionId,
  getMockGuestCartSessionId,
  persistGuestCartToken,
} from "@/features/cart/server/guest-cart-session";
import {
  addMockStoredCartLine,
  clearMockStoredCart,
  readMockStoredCart,
  removeMockStoredCartLine,
  updateMockStoredCartLine,
  type CartOwner,
  type StoredCart,
  type StoredCartLine,
} from "@/features/cart/server/mock-cart-repository";
import type {
  AddCartLineInput,
  AddCartLineResult,
  CartLine,
  CartMoney,
  CartMutationResult,
  CartSnapshot,
} from "@/features/cart/types/cart.types";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { resolveCurrentLocation } from "@/features/location/server/resolve-current-location";
import { getCanonicalBackendCityId } from "@/features/location/types";
import { getResolvedVariantAvailability } from "@/features/products/server/product-availability-boundary";
import { getProductDetailsById } from "@/features/products/server/product-boundary";
import type { ProductDetails, ProductVariant } from "@/features/products/types/product-details.types";
import { assertProductConfiguration } from "@/features/products/utils/assert-product-configuration";
import { validateProductPersonalization } from "@/features/products/utils/validate-product-personalization";
import { getPublicSettings } from "@/features/settings/server/public-settings-boundary";

const CART_CURRENCY = "SAR";

function money(amount: number | string, currency = CART_CURRENCY): CartMoney {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric < 0) throw new Error("The mock Cart contains invalid financial data.");
  return { amount: String(amount), currency };
}

function emptyCartSnapshot(): CartSnapshot {
  const zero = money(0);
  return {
    city: null,
    lines: [],
    summary: {
      lineCount: 0,
      totalQuantity: 0,
      subtotal: zero,
      productDiscountTotal: zero,
      personalizationTotal: zero,
      couponDiscount: zero,
      giftWrapFee: zero,
      shippingFee: null,
      freeShipping: { enabled: false, threshold: zero, qualifies: false, remaining: zero },
      total: zero,
      vat: { rate: "0", includedAmount: zero },
    },
    coupon: null,
    gift: { isGift: false, isAnonymous: false, message: null, giftWrap: false, recipient: null },
  };
}

async function resolveMockCartOwner(createGuest: boolean): Promise<CartOwner | null> {
  const user = await getCurrentUser();
  if (user) return { kind: "customer", id: user.id };
  const currentSessionId = await getMockGuestCartSessionId();
  if (currentSessionId) return { kind: "guest", id: currentSessionId };
  if (!createGuest) return null;
  return { kind: "guest", id: await createMockGuestCartSessionId() };
}

function getVariantAttributes(product: ProductDetails, variant: ProductVariant) {
  return Object.fromEntries(
    variant.optionValues.map((selection) => {
      const option = product.options.find((candidate) => candidate.id === selection.optionId);
      const value = option?.values.find((candidate) => candidate.id === selection.valueId);
      if (!option || !value) throw new Error("A stored Cart variant has invalid option configuration.");
      return [option.name, value.label];
    }),
  );
}

async function materializeMockLine(
  line: StoredCartLine,
  locale: Locale,
  locationId: string | null,
): Promise<CartLine> {
  const product = await getProductDetailsById(line.productId, locale);
  if (!product) throw new Error("A stored Cart Product is unavailable.");
  assertProductConfiguration(product);
  const variant = product.variants.find((candidate) => candidate.id === line.variantId);
  if (!variant) throw new Error("A stored Cart variant is invalid.");

  const availability = (await getResolvedVariantAvailability({
    locationId,
    source: "mock",
    variants: product.variants,
  }))[variant.id];
  if (!availability) throw new Error("A stored Cart variant has no availability projection.");

  const image = product.images.find((candidate) => variant.imageIds.includes(candidate.id)) ?? product.images[0] ?? null;
  const unitPrice = variant.pricing.current.amount;
  const regularPrice = variant.pricing.compareAt?.amount ?? unitPrice;
  const personalizationFee = product.personalization.enabled
    ? (product.personalization.additionalFee?.amount ?? 0)
    : 0;

  return {
    id: line.lineId,
    product: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: image ? { id: image.id, src: image.src } : null,
      personalizable: product.personalization.enabled,
    },
    variant: { id: variant.id, sku: variant.sku, attributes: getVariantAttributes(product, variant) },
    personalization: line.personalization
      ? { language: line.personalization.language, text: line.personalization.text, raw: line.personalization }
      : null,
    quantity: line.quantity,
    stock: {
      status: availability.status === "available" ? "ok" : "out_of_stock",
      available: availability.status === "available" ? availability.maxOrderQuantity : 0,
    },
    unitRegularPrice: money(regularPrice),
    unitPrice: money(unitPrice),
    discountActive: regularPrice > unitPrice,
    personalizationFee: money(personalizationFee),
    lineTotal: money((unitPrice + personalizationFee) * line.quantity),
  };
}

async function materializeMockCart(storedCart: StoredCart, locale: Locale): Promise<CartSnapshot> {
  if (storedCart.lines.length === 0) return emptyCartSnapshot();
  const [location, settings] = await Promise.all([resolveCurrentLocation(locale), getPublicSettings()]);
  const lines = await Promise.all(
    storedCart.lines.map((line) => materializeMockLine(line, locale, location?.source === "mock" ? location.id : null)),
  );
  const totals = lines.reduce(
    (sum, line) => ({
      subtotal: sum.subtotal + Number(line.unitPrice.amount) * line.quantity,
      personalization: sum.personalization + Number(line.personalizationFee.amount) * line.quantity,
      quantity: sum.quantity + line.quantity,
    }),
    { subtotal: 0, personalization: 0, quantity: 0 },
  );
  const total = totals.subtotal + totals.personalization;
  const remaining = Math.max(0, settings.freeShippingThreshold - total);

  return {
    city: null,
    lines,
    summary: {
      lineCount: lines.length,
      totalQuantity: totals.quantity,
      subtotal: money(totals.subtotal),
      productDiscountTotal: money(0),
      personalizationTotal: money(totals.personalization),
      couponDiscount: money(0),
      giftWrapFee: money(0),
      shippingFee: null,
      freeShipping: {
        enabled: settings.freeShippingEnabled,
        threshold: money(settings.freeShippingThreshold),
        qualifies: settings.freeShippingEnabled && remaining === 0,
        remaining: money(remaining),
      },
      total: money(total),
      vat: { rate: String(settings.vatRate), includedAmount: money(0) },
    },
    coupon: null,
    gift: { isGift: false, isAnonymous: false, message: null, giftWrap: false, recipient: null },
  };
}

function assertSuccessfulResponse(response: CartResponseDto): CartResponseDto {
  if (!response.success) throw new Error("The Cart API returned an unsuccessful response.");
  return response;
}

async function syncGuestToken(identity: CartTransportIdentity, response: CartResponseDto) {
  if (identity.kind !== "guest" || !response.data.token) return;
  if (!identity.token) {
    await persistGuestCartToken(response.data.token);
  } else if (response.data.token !== identity.token) {
    throw new Error("The Cart API unexpectedly rotated the guest token.");
  }
}

function positiveBackendId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function getCurrentCart(locale: Locale): Promise<CartSnapshot> {
  if (serverEnv.useMockApi) {
    const owner = await resolveMockCartOwner(false);
    return owner ? materializeMockCart(await readMockStoredCart(owner), locale) : emptyCartSnapshot();
  }
  const identity = await resolveCartTransportIdentity();
  return mapCartData(assertSuccessfulResponse(await getCartDto(identity, locale)).data);
}

export async function addLineToCurrentCart(input: AddCartLineInput, locale: Locale): Promise<AddCartLineResult> {
  if (serverEnv.useMockApi) return addMockLine(input, locale);
  const location = await resolveCurrentLocation(locale);
  const cityId = getCanonicalBackendCityId(location);
  if (!cityId) return { ok: false, error: { code: "location-required" } };
  const variantId = positiveBackendId(input.variantId);
  if (!variantId) return { ok: false, error: { code: "variant-invalid" } };
  const identity = await resolveCartTransportIdentity();
  const response = assertSuccessfulResponse(await addCartItemDto(identity, locale, {
    product_variant_id: variantId,
    city_id: cityId,
    quantity: input.quantity,
    ...(input.personalization
      ? {
          personalization_text: input.personalization.text,
          personalization_language: input.personalization.language === "arabic" ? "ar" : "en",
        }
      : {}),
  }));
  await syncGuestToken(identity, response);
  return { ok: true, cart: mapCartData(response.data) };
}

async function addMockLine(input: AddCartLineInput, locale: Locale): Promise<AddCartLineResult> {
  const product = await getProductDetailsById(input.productId, locale);
  if (!product) return { ok: false, error: { code: "product-unavailable" } };
  assertProductConfiguration(product);
  const variant = product.variants.find((candidate) => candidate.id === input.variantId);
  if (!variant) return { ok: false, error: { code: "variant-invalid" } };
  if (product.personalization.enabled) {
    if (!input.personalization) return { ok: false, error: { code: "invalid-personalization", reason: "required" } };
    const validation = validateProductPersonalization(product.personalization, input.personalization);
    if (!validation.valid) return { ok: false, error: { code: "invalid-personalization", reason: validation.error.code } };
  } else if (input.personalization) return { ok: false, error: { code: "invalid-input" } };

  const location = await resolveCurrentLocation(locale);
  if (!location || location.source !== "mock") return { ok: false, error: { code: "location-required" } };
  const availability = (await getResolvedVariantAvailability({ locationId: location.id, source: "mock", variants: product.variants }))[variant.id];
  if (!availability || availability.status === "unavailable_at_location") return { ok: false, error: { code: "unavailable-at-location" } };
  if (availability.status === "out_of_stock") return { ok: false, error: { code: "out-of-stock" } };
  if (availability.status !== "available") return { ok: false, error: { code: "service-unavailable" } };
  if (input.quantity > availability.maxOrderQuantity) return { ok: false, error: { code: "quantity-limit-exceeded", maxOrderQuantity: availability.maxOrderQuantity } };

  const owner = await resolveMockCartOwner(true);
  if (!owner) throw new Error("A Cart owner could not be resolved.");
  const { cart } = await addMockStoredCartLine(owner, {
    productId: product.id,
    variantId: variant.id,
    quantity: input.quantity,
    personalization: input.personalization ?? null,
  });
  return { ok: true, cart: await materializeMockCart(cart, locale) };
}

export async function updateCurrentCartLine(lineId: string, quantity: number, locale: Locale): Promise<CartMutationResult> {
  if (serverEnv.useMockApi) {
    const owner = await resolveMockCartOwner(false);
    if (!owner) return { ok: false, error: { code: "line-not-found" } };
    const settings = await getPublicSettings();
    if (quantity > settings.maxCartItemQuantity) return { ok: false, error: { code: "quantity-limit-exceeded", maxOrderQuantity: settings.maxCartItemQuantity } };
    const cart = await updateMockStoredCartLine(owner, lineId, quantity);
    return cart ? { ok: true, cart: await materializeMockCart(cart, locale) } : { ok: false, error: { code: "line-not-found" } };
  }
  const backendLineId = positiveBackendId(lineId);
  if (!backendLineId) return { ok: false, error: { code: "invalid-input" } };
  const identity = await resolveCartTransportIdentity();
  const response = assertSuccessfulResponse(await updateCartItemDto(identity, locale, backendLineId, { quantity }));
  await syncGuestToken(identity, response);
  return { ok: true, cart: mapCartData(response.data) };
}

export async function removeCurrentCartLine(lineId: string, locale: Locale): Promise<CartMutationResult> {
  if (serverEnv.useMockApi) {
    const owner = await resolveMockCartOwner(false);
    if (!owner) return { ok: false, error: { code: "line-not-found" } };
    const cart = await removeMockStoredCartLine(owner, lineId);
    return cart ? { ok: true, cart: await materializeMockCart(cart, locale) } : { ok: false, error: { code: "line-not-found" } };
  }
  const backendLineId = positiveBackendId(lineId);
  if (!backendLineId) return { ok: false, error: { code: "invalid-input" } };
  const identity = await resolveCartTransportIdentity();
  const response = assertSuccessfulResponse(await removeCartItemDto(identity, locale, backendLineId));
  await syncGuestToken(identity, response);
  return { ok: true, cart: mapCartData(response.data) };
}

export async function clearCurrentCart(locale: Locale): Promise<CartMutationResult> {
  if (serverEnv.useMockApi) {
    const owner = await resolveMockCartOwner(false);
    if (!owner) return { ok: true, cart: emptyCartSnapshot() };
    const cart = await clearMockStoredCart(owner);
    if (owner.kind === "guest") await deleteMockGuestCartSessionId();
    return { ok: true, cart: await materializeMockCart(cart, locale) };
  }
  const identity = await resolveCartTransportIdentity();
  const response = assertSuccessfulResponse(await clearCartDto(identity, locale));
  if (identity.kind === "guest" && identity.token) await deleteGuestCartToken();
  return { ok: true, cart: mapCartData(response.data) };
}
