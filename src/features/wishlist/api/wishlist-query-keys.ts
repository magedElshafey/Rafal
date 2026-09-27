import type { Locale } from "next-intl";

export const wishlistQueryKeys = {
  all: ["wishlist"] as const,
  count: (locale: Locale) => ["wishlist", "count", locale] as const,
  list: (locale: Locale) => ["wishlist", "list", locale] as const,
  mutation: (productId: string) =>
    ["wishlist", "mutation", productId] as const,
};
