"use client";

import { useQuery } from "@tanstack/react-query";
import type { Locale } from "next-intl";

import { checkoutQuoteQueryOptions } from "@/features/checkout/api/checkout-query";
import type { CheckoutQuoteRequest } from "@/features/checkout/types/checkout.types";

export function useCheckoutQuote(
  locale: Locale,
  committedRequest: CheckoutQuoteRequest | null,
) {
  return useQuery(checkoutQuoteQueryOptions(locale, committedRequest));
}
