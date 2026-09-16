"use server";

import { getLocale } from "next-intl/server";
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

function parseInput(input: unknown): SetWishlistStateInput | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  if (
    typeof candidate.productId !== "string" ||
    !isKnownProductId(candidate.productId) ||
    typeof candidate.wishlisted !== "boolean"
  ) {
    return null;
  }

  return {
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
    const [entries, locale] = await Promise.all([
      readMockWishlistEntries(user),
      getLocale(),
    ]);
    const withoutProduct = entries.filter(
      (entry) => entry.productId !== parsedInput.productId,
    );
    const nextEntries = parsedInput.wishlisted
      ? [...withoutProduct, { productId: parsedInput.productId }]
      : withoutProduct;

    await writeMockWishlistEntries(user, nextEntries);
    revalidatePath(`/${locale}/account/wishlist`);

    return { ok: true };
  } catch {
    return { ok: false };
  }
}
