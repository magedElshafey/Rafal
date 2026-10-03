import { queryOptions } from "@tanstack/react-query";
import type { Locale } from "next-intl";

import type {
  CheckoutQuote,
  CheckoutQuoteRequest,
} from "@/features/checkout/types/checkout.types";
import { ApiError } from "@/lib/api/api-error";

export const checkoutQuoteQueryKeyRoot = ["checkout", "quote"] as const;

export function checkoutQuoteQueryKey(
  locale: Locale,
  request: CheckoutQuoteRequest | null,
) {
  return [...checkoutQuoteQueryKeyRoot, locale, request] as const;
}

async function fetchCheckoutQuote(
  locale: Locale,
  request: CheckoutQuoteRequest,
  signal: AbortSignal,
): Promise<CheckoutQuote> {
  const searchParams = new URLSearchParams({ locale });
  const response = await fetch(`/api/checkout/quote?${searchParams}`, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    let code: string | undefined;
    try {
      const body = (await response.json()) as { code?: unknown };
      code = typeof body.code === "string" ? body.code : undefined;
    } catch {
      // The browser boundary intentionally falls back to a safe generic error.
    }
    throw new ApiError({
      status: response.status,
      code,
      message: "Checkout quote request failed.",
    });
  }

  return response.json() as Promise<CheckoutQuote>;
}

export function checkoutQuoteQueryOptions(
  locale: Locale,
  committedRequest: CheckoutQuoteRequest | null,
) {
  return queryOptions({
    queryKey: checkoutQuoteQueryKey(locale, committedRequest),
    queryFn: ({ signal }) => {
      if (!committedRequest) {
        throw new Error("A committed Checkout destination is required.");
      }
      return fetchCheckoutQuote(locale, committedRequest, signal);
    },
    enabled: committedRequest !== null,
    staleTime: 30_000,
    retry: false,
  });
}
