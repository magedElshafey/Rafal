import "server-only";

import { CheckoutCartSessionError } from "@/features/checkout/server/checkout-boundary";
import type { CheckoutQuoteError } from "@/features/checkout/types/checkout.types";
import { ApiError } from "@/lib/api/api-error";

export function mapCheckoutQuoteError(error: unknown): CheckoutQuoteError {
  if (error instanceof CheckoutCartSessionError) {
    return { code: "cart-session-unavailable" };
  }

  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return { code: "unauthorized" };
    }
    if (error.status === 400 || error.status === 422) {
      return { code: "invalid-input", fields: [] };
    }
  }

  return { code: "service-unavailable" };
}