import type { Locale } from "next-intl";

import type { PaginatedListingProducts } from "@/features/products/types/product-listing.types";

export const WISHLIST_PAGE_SIZE = 15;

export type WishlistPage = PaginatedListingProducts;

export type WishlistCount = {
  count: number;
};

export type SetWishlistStateInput = {
  locale: Locale;
  productId: string;
  wishlisted: boolean;
};

export type WishlistMutationError = {
  code: "invalid-input" | "service-unavailable" | "unauthorized";
};

export type WishlistMutationResult =
  | { ok: true }
  | { ok: false; error: WishlistMutationError };
