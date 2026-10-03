import { hasLocale } from "next-intl";

import { parseCheckoutUnavailableLines } from "@/features/checkout/api/parse-checkout-dto";
import {
  CheckoutCartSessionError,
  CheckoutIdentityMismatchError,
  placeCurrentCheckout,
} from "@/features/checkout/server/checkout-boundary";
import { parseCheckoutPlaceRequest } from "@/features/checkout/server/parse-checkout-place-request";
import type { CheckoutUnavailableLine } from "@/features/checkout/types/checkout.types";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" } as const;

function errorResponse(
  code: string,
  status: number,
  unavailableLines?: readonly CheckoutUnavailableLine[],
) {
  return Response.json(
    { code, ...(unavailableLines ? { unavailableLines } : {}) },
    { status, headers: PRIVATE_NO_STORE_HEADERS },
  );
}

function unavailableLines(details: unknown): readonly CheckoutUnavailableLine[] {
  if (typeof details !== "object" || details === null || Array.isArray(details)) {
    return [];
  }
  const value = (details as Record<string, unknown>).unavailable_lines;
  if (value === undefined) return [];

  try {
    return parseCheckoutUnavailableLines(value).map((line) => ({
      cartItemId: line.cart_item_id,
      productName: line.product_name,
      requested: line.requested,
      available: line.available,
      variantTotalRequested: line.variant_total_requested,
    }));
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return errorResponse("invalid-locale", 400);
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return errorResponse("invalid-input", 400);
  }
  const placeRequest = parseCheckoutPlaceRequest(value);
  if (!placeRequest) return errorResponse("invalid-input", 400);

  try {
    const result = await placeCurrentCheckout(
      locale,
      placeRequest,
      request.signal,
    );
    return Response.json(result, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof CheckoutCartSessionError) {
      return errorResponse("cart-session-unavailable", 409);
    }
    if (error instanceof CheckoutIdentityMismatchError) {
      return errorResponse("identity-mismatch", 409);
    }
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return errorResponse("unauthorized", 401);
      }
      const lines = unavailableLines(error.details);
      if (lines.length > 0) {
        return errorResponse("unavailable-lines", 409, lines);
      }
      if (error.status === 409 || error.status === 422) {
        return errorResponse("checkout-changed", 409);
      }
    }
    return errorResponse("service-unavailable", 503);
  }
}
