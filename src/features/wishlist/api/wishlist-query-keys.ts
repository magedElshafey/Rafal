import type { Locale } from "next-intl";

export const wishlistQueryKeys = {
  all: ["wishlist"] as const,
  account: (accountId: string) => ["wishlist", accountId] as const,
  count: (accountId: string, locale: Locale) =>
    ["wishlist", accountId, "count", locale] as const,
  list: (accountId: string, locale: Locale) =>
    ["wishlist", accountId, "list", locale] as const,
  mutation: (accountId: string) => ["wishlist", accountId, "mutation"] as const,
};
