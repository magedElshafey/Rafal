import "server-only";

import type { Locale } from "next-intl";

import { lookupGuestOrderDto } from "@/features/orders/api/guest-orders-api.server";
import { mapOrderDetails } from "@/features/orders/api/orders-mapper";
import type {
  GuestOrderLookupErrorCode,
  GuestOrderLookupInput,
} from "@/features/orders/types/guest-order-lookup.types";
import type { OrderDetails } from "@/features/orders/types/order.types";
import { ApiError } from "@/lib/api/api-error";

export class GuestOrderIdentityMismatchError extends Error {
  constructor() {
    super("Guest lookup response identity did not match the requested order.");
    this.name = "GuestOrderIdentityMismatchError";
  }
}

export function classifyGuestOrderLookupError(
  error: unknown,
): Exclude<GuestOrderLookupErrorCode, "invalid-input"> {
  if (error instanceof ApiError && error.status === 429) return "rate-limited";
  if (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500
  ) {
    return "lookup-mismatch";
  }
  return "service-unavailable";
}

export async function lookupGuestOrder(
  locale: Locale,
  input: GuestOrderLookupInput,
  signal?: AbortSignal,
): Promise<OrderDetails> {
  const response = await lookupGuestOrderDto(locale, input, signal);
  if (response.data.order_number !== input.orderNumber) {
    throw new GuestOrderIdentityMismatchError();
  }
  return mapOrderDetails(response);
}
