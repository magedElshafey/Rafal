"use client";

import { useMutation } from "@tanstack/react-query";
import type { Locale } from "next-intl";

import { verifyCheckoutOrderFromBrowser } from "@/features/checkout/api/checkout-verify-mutation";
import type { CheckoutVerifyRequest } from "@/features/checkout/types/checkout.types";

export function useCheckoutVerify(locale: Locale) {
  return useMutation({
    mutationKey: ["checkout", "verify"],
    mutationFn: (request: CheckoutVerifyRequest) =>
      verifyCheckoutOrderFromBrowser(locale, request),
    retry: false,
  });
}
