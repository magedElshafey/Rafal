"use server";

import { hasLocale } from "next-intl";
import { mapCartActionError } from "@/features/cart/actions/cart-action-errors";
import { updateCurrentCartLine } from "@/features/cart/server/cart-boundary";
import type { CartMutationResult } from "@/features/cart/types/cart.types";
import { routing } from "@/i18n/routing";

export async function updateCartLine(lineId: unknown, quantity: unknown, locale: unknown): Promise<CartMutationResult> {
  if (typeof lineId !== "string" || lineId.length === 0 || lineId.length > 128 || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0 || quantity > 10_000 || typeof locale !== "string" || !hasLocale(routing.locales, locale)) {
    return { ok: false, error: { code: "invalid-input" } };
  }
  try {
    return await updateCurrentCartLine(lineId, quantity, locale);
  } catch (error) {
    return { ok: false, error: mapCartActionError(error) };
  }
}
