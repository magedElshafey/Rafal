import "server-only";

import type { Locale } from "next-intl";

import { serverEnv } from "@/config/server-env";
import {
  getCurrentUser,
  requireUser,
} from "@/features/auth/server/auth-boundary";
import { getListingProductById } from "@/features/products/server/mock-product-catalog";
import type { ListingProduct } from "@/features/products/types/product-listing.types";
import { readMockWishlistEntries } from "@/features/wishlist/server/mock-wishlist-store";
import type { WishlistMembership } from "@/features/wishlist/types/wishlist.types";

function assertWishlistSourceAvailable() {
  if (!serverEnv.useMockApi) {
    throw new Error("The Wishlist API contract is not configured.");
  }
}

export async function getWishlistProductIds(): Promise<string[]> {
  const user = await requireUser("/account/wishlist");
  assertWishlistSourceAvailable();

  const entries = await readMockWishlistEntries(user);
  return entries.map((entry) => entry.productId);
}

export async function getWishlistProducts(
  locale: Locale,
): Promise<ListingProduct[]> {
  const user = await requireUser("/account/wishlist");
  assertWishlistSourceAvailable();

  const entries = await readMockWishlistEntries(user);

  return entries.flatMap((entry) => {
    const product = getListingProductById(entry.productId, locale);
    return product ? [product] : [];
  });
}

export async function getWishlistMembership(): Promise<WishlistMembership> {
  const user = await getCurrentUser();
  if (!user) return { authenticated: false, productIds: [] };

  assertWishlistSourceAvailable();
  const entries = await readMockWishlistEntries(user);

  return {
    authenticated: true,
    productIds: entries.map((entry) => entry.productId),
  };
}
