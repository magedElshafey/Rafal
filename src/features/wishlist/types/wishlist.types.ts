import type { Locale } from "next-intl";

export type WishlistEntry = {
  productId: string;
};

export type SetWishlistStateInput = {
  locale: Locale;
  productId: string;
  wishlisted: boolean;
};

export type WishlistMutationResult =
  | { ok: true }
  | { ok: false };

export type WishlistMembership = {
  authenticated: boolean;
  productIds: string[];
};
