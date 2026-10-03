"use client";

import { useMutation } from "@tanstack/react-query";
import type { Locale } from "next-intl";

import { placeCheckoutFromBrowser } from "@/features/checkout/api/checkout-place-mutation";
import type { CheckoutPlaceRequest } from "@/features/checkout/types/checkout.types";

export function useCheckoutPlace(locale: Locale) {
  return useMutation({
    mutationKey: ["checkout", "place"],
    mutationFn: (request: CheckoutPlaceRequest) =>
      placeCheckoutFromBrowser(locale, request),
    retry: false,
  });
}
