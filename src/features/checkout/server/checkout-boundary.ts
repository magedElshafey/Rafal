import "server-only";

import type { Locale } from "next-intl";

import {
  placeCheckout,
  quoteCheckout,
  verifyCheckoutOrder,
} from "@/features/checkout/api/checkout-api.server";
import type {
  CheckoutPlaceRequest,
  CheckoutPlaceResult,
  CheckoutQuote,
  CheckoutQuoteRequest,
  CheckoutVerifyRequest,
  CheckoutVerifyResult,
} from "@/features/checkout/types/checkout.types";
import { resolveCartTransportIdentity } from "@/features/cart/server/cart-auth-context";

export class CheckoutCartSessionError extends Error {
  constructor() {
    super("An existing Cart identity is required to quote Checkout.");
    this.name = "CheckoutCartSessionError";
  }
}

export class CheckoutIdentityMismatchError extends Error {
  constructor() {
    super("Checkout buyer identity does not match the active Cart identity.");
    this.name = "CheckoutIdentityMismatchError";
  }
}

export async function quoteCurrentCheckout(
  locale: Locale,
  request: CheckoutQuoteRequest,
  signal?: AbortSignal,
): Promise<CheckoutQuote> {
  const identity = await resolveCartTransportIdentity();

  if (identity.kind === "authenticated") {
    return quoteCheckout(identity, locale, request, signal);
  }

  if (!identity.token) {
    throw new CheckoutCartSessionError();
  }

  return quoteCheckout(
    { kind: "guest", token: identity.token },
    locale,
    request,
    signal,
  );
}

export async function placeCurrentCheckout(
  locale: Locale,
  request: CheckoutPlaceRequest,
  signal?: AbortSignal,
): Promise<CheckoutPlaceResult> {
  const identity = await resolveCartTransportIdentity();

  if (identity.kind === "authenticated") {
    if (request.buyer.kind !== "authenticated") {
      throw new CheckoutIdentityMismatchError();
    }
    return placeCheckout(identity, locale, request, signal);
  }

  if (!identity.token) throw new CheckoutCartSessionError();
  if (request.buyer.kind !== "guest") {
    throw new CheckoutIdentityMismatchError();
  }
  return placeCheckout(
    { kind: "guest", token: identity.token },
    locale,
    request,
    signal,
  );
}

export function verifyGuestCheckoutOrder(
  locale: Locale,
  request: CheckoutVerifyRequest,
  signal?: AbortSignal,
): Promise<CheckoutVerifyResult> {
  return verifyCheckoutOrder(locale, request, signal);
}
