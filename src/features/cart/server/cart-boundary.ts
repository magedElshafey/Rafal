import "server-only";

import type { Locale } from "next-intl";

import { getAccessToken } from "@/features/auth/server/auth-session";
import {
  addCartItemDto,
  applyCartCouponDto,
  clearCartDto,
  getCartCouponsDto,
  getCartDto,
  removeCartCouponDto,
  removeCartItemDto,
  updateCartItemDto,
  type CartTransportIdentity,
} from "@/features/cart/api/cart-api.server";
import type {
  CartCouponsResponseDto,
  CartResponseDto,
} from "@/features/cart/api/cart-dto";
import {
  mapCartCouponOption,
  mapCartData,
} from "@/features/cart/api/cart-mapper";
import type { CartAddDiagnostics } from "@/features/cart/server/cart-add-diagnostics";
import { resolveCartTransportIdentity } from "@/features/cart/server/cart-auth-context";
import {
  deleteGuestCartToken,
  persistGuestCartToken,
} from "@/features/cart/server/guest-cart-session";
import type {
  AddCartLineInput,
  AddCartLineResult,
  CartCouponOption,
  CartMutationResult,
  CartSnapshot,
} from "@/features/cart/types/cart.types";
import { readGuestCityId } from "@/features/location/server/guest-city-session";

function assertSuccessfulResponse(response: CartResponseDto): CartResponseDto {
  if (!response.success) {
    throw new Error("The Cart API returned an unsuccessful response.");
  }
  return response;
}

function assertSuccessfulCouponsResponse(
  response: CartCouponsResponseDto,
): CartCouponsResponseDto {
  if (!response.success) {
    throw new Error("The Cart Coupons API returned an unsuccessful response.");
  }
  return response;
}

async function requireAuthenticatedCartToken(): Promise<string> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("An authenticated session is required for Cart coupons.");
  }
  return accessToken;
}

async function syncGuestToken(
  identity: CartTransportIdentity,
  response: CartResponseDto,
  diagnostics?: CartAddDiagnostics,
) {
  if (identity.kind !== "guest" || !response.data.token) return;
  if (!identity.token) {
    diagnostics?.stage("token-persist-start");
    await persistGuestCartToken(response.data.token);
    diagnostics?.stage("token-persist-complete");
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
  const identity = await resolveCartTransportIdentity();
  const response = assertSuccessfulResponse(await getCartDto(identity, locale));
  return mapCartData(response.data);
}

export async function addLineToCurrentCart(
  input: AddCartLineInput,
  locale: Locale,
  diagnostics?: CartAddDiagnostics,
): Promise<AddCartLineResult> {
  const cityId = await readGuestCityId();
  diagnostics?.stage("city", { cityIdPresent: cityId !== null });
  if (!cityId) return { ok: false, error: { code: "location-required" } };

  const variantId = positiveBackendId(input.variantId);
  if (!variantId) return { ok: false, error: { code: "variant-invalid" } };

  diagnostics?.stage("identity-start");
  const identity = await resolveCartTransportIdentity();
  diagnostics?.stage("identity", {
    kind: identity.kind,
    hasExistingGuestToken: identity.kind === "guest" && identity.token !== null,
  });
  const response = assertSuccessfulResponse(
    await addCartItemDto(
      identity,
      locale,
      {
        product_variant_id: variantId,
        city_id: cityId,
        quantity: input.quantity,
        ...(input.personalization
          ? {
              personalization_text: input.personalization.text,
              personalization_language:
                input.personalization.language === "arabic" ? "ar" : "en",
            }
          : {}),
      },
      diagnostics,
    ),
  );
  if (identity.kind === "guest" && !identity.token && !response.data.token) {
    throw new Error(
      "Invalid Cart API payload: a newly created guest Cart must return a non-empty data.token.",
    );
  }
  await syncGuestToken(identity, response, diagnostics);
  const cart = mapCartData(response.data);
  diagnostics?.stage("success");
  return { ok: true, cart };
}

export async function updateCurrentCartLine(
  lineId: string,
  quantity: number,
  locale: Locale,
): Promise<CartMutationResult> {
  const backendLineId = positiveBackendId(lineId);
  if (!backendLineId) return { ok: false, error: { code: "invalid-input" } };
  const identity = await resolveCartTransportIdentity();
  const response = assertSuccessfulResponse(
    await updateCartItemDto(identity, locale, backendLineId, { quantity }),
  );
  await syncGuestToken(identity, response);
  return { ok: true, cart: mapCartData(response.data) };
}

export async function removeCurrentCartLine(
  lineId: string,
  locale: Locale,
): Promise<CartMutationResult> {
  const backendLineId = positiveBackendId(lineId);
  if (!backendLineId) return { ok: false, error: { code: "invalid-input" } };
  const identity = await resolveCartTransportIdentity();
  const response = assertSuccessfulResponse(
    await removeCartItemDto(identity, locale, backendLineId),
  );
  await syncGuestToken(identity, response);
  return { ok: true, cart: mapCartData(response.data) };
}

export async function clearCurrentCart(
  locale: Locale,
): Promise<CartMutationResult> {
  const identity = await resolveCartTransportIdentity();
  const response = assertSuccessfulResponse(await clearCartDto(identity, locale));
  if (identity.kind === "guest" && identity.token) {
    await deleteGuestCartToken();
  }
  return { ok: true, cart: mapCartData(response.data) };
}

export async function getAvailableCartCoupons(
  locale: Locale,
): Promise<readonly CartCouponOption[]> {
  const accessToken = await requireAuthenticatedCartToken();
  const response = assertSuccessfulCouponsResponse(
    await getCartCouponsDto(accessToken, locale),
  );
  return response.data.map(mapCartCouponOption);
}

export async function applyCouponToCurrentCart(
  code: string,
  locale: Locale,
): Promise<CartSnapshot> {
  const accessToken = await requireAuthenticatedCartToken();
  const response = assertSuccessfulResponse(
    await applyCartCouponDto(accessToken, locale, { code }),
  );
  return mapCartData(response.data);
}

export async function removeCouponFromCurrentCart(
  locale: Locale,
): Promise<CartSnapshot> {
  const accessToken = await requireAuthenticatedCartToken();
  const response = assertSuccessfulResponse(
    await removeCartCouponDto(accessToken, locale),
  );
  return mapCartData(response.data);
}
