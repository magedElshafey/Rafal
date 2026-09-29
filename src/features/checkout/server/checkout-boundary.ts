import "server-only";

import type { Locale } from "next-intl";

import { quoteCheckout } from "@/features/checkout/api/checkout-api.server";
import type {
  CheckoutQuote,
  CheckoutQuoteRequest,
} from "@/features/checkout/types/checkout.types";
import { resolveCartTransportIdentity } from "@/features/cart/server/cart-auth-context";

export class CheckoutCartSessionError extends Error {
  constructor() {
    super("An existing Cart identity is required to quote Checkout.");
    this.name = "CheckoutCartSessionError";
  }
}

export async function quoteCurrentCheckout(
  locale: Locale,
  request: CheckoutQuoteRequest,
): Promise<CheckoutQuote> {
  const identity = await resolveCartTransportIdentity();

  if (identity.kind === "guest" && !identity.token) {
    throw new CheckoutCartSessionError();
  }

  return quoteCheckout(identity, locale, request);
}