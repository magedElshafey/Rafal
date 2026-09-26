"use server";

import { hasLocale } from "next-intl";

import { mergeGuestCartIntoAuthenticatedCart } from "@/features/cart/server/cart-merge-boundary";
import type { CartMergeResult } from "@/features/cart/types/cart.types";
import { routing } from "@/i18n/routing";

export async function mergeCartAfterAuth(
  localeValue: unknown,
): Promise<CartMergeResult> {
  if (
    typeof localeValue !== "string" ||
    !hasLocale(routing.locales, localeValue)
  ) {
    return { ok: false, error: { code: "service-unavailable" } };
  }

  try {
    return await mergeGuestCartIntoAuthenticatedCart(localeValue);
  } catch {
    return { ok: false, error: { code: "service-unavailable" } };
  }
}
