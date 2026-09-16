"use server";

import { hasLocale } from "next-intl";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/features/auth/server/auth-boundary";
import { isKnownProductId } from "@/features/products/server/mock-product-catalog";
import {
  readMockWishlistEntries,
  writeMockWishlistEntries,
} from "@/features/wishlist/server/mock-wishlist-store";
import type {
  SetWishlistStateInput,
  WishlistMutationResult,
} from "@/features/wishlist/types/wishlist.types";
import { routing } from "@/i18n/routing";

function parseInput(input: unknown): SetWishlistStateInput | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  if (
    typeof candidate.locale !== "string" ||
    !hasLocale(routing.locales, candidate.locale) ||
    typeof candidate.productId !== "string" ||
    !isKnownProductId(candidate.productId) ||
    typeof candidate.wishlisted !== "boolean"
  ) {
    return null;
  }

  return {
    locale: candidate.locale,
    productId: candidate.productId,
    wishlisted: candidate.wishlisted,
  };
}

export async function setWishlistState(
  input: unknown,
): Promise<WishlistMutationResult> {
  const user = await requireUser("/account/wishlist");

  const parsedInput = parseInput(input);
  if (!parsedInput) return { ok: false };

  try {
    const entries = await readMockWishlistEntries(user);
    const withoutProduct = entries.filter(
      (entry) => entry.productId !== parsedInput.productId,
    );
    const nextEntries = parsedInput.wishlisted
      ? [...withoutProduct, { productId: parsedInput.productId }]
      : withoutProduct;

    await writeMockWishlistEntries(user, nextEntries);
    revalidatePath(`/${parsedInput.locale}/account/wishlist`);

    return { ok: true };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const errorMessage =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);

      console.error(
        `[wishlist:set-state] Unexpected mutation failure for product "${parsedInput.productId}": ${errorMessage}`,
      );
    }

    return { ok: false };
  }
}
