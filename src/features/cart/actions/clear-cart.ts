"use server";

import { hasLocale } from "next-intl";
import { mapCartActionError } from "@/features/cart/actions/cart-action-errors";
import { clearCurrentCart } from "@/features/cart/server/cart-boundary";
import type { CartMutationResult } from "@/features/cart/types/cart.types";
import { routing } from "@/i18n/routing";

export async function clearCart(locale: unknown): Promise<CartMutationResult> {
  if (typeof locale !== "string" || !hasLocale(routing.locales, locale)) return { ok: false, error: { code: "invalid-input" } };
  try {
    return await clearCurrentCart(locale);
  } catch (error) {
    return { ok: false, error: mapCartActionError(error) };
  }
}
