import {
  infiniteQueryOptions,
  queryOptions,
} from "@tanstack/react-query";
import type { Locale } from "next-intl";

import { wishlistQueryKeys } from "@/features/wishlist/api/wishlist-query-keys";
import type {
  WishlistCount,
  WishlistPage,
} from "@/features/wishlist/types/wishlist.types";

async function fetchWishlistPage({
  locale,
  page,
  signal,
}: {
  locale: Locale;
  page: number;
  signal?: AbortSignal;
}): Promise<WishlistPage> {
  const searchParams = new URLSearchParams({ locale, page: String(page) });
  const response = await fetch(`/api/wishlist?${searchParams}`, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("Wishlist request failed.");
  return response.json() as Promise<WishlistPage>;
}

async function fetchWishlistCount({
  locale,
  signal,
}: {
  locale: Locale;
  signal?: AbortSignal;
}): Promise<WishlistCount> {
  const searchParams = new URLSearchParams({ locale });
  const response = await fetch(`/api/wishlist/count?${searchParams}`, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("Wishlist count request failed.");
  return response.json() as Promise<WishlistCount>;
}

export function wishlistInfiniteQueryOptions(locale: Locale) {
  return infiniteQueryOptions({
    queryKey: wishlistQueryKeys.list(locale),
    queryFn: ({ pageParam, signal }) =>
      fetchWishlistPage({ locale, page: pageParam, signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.current_page < lastPage.pagination.last_page
        ? lastPage.pagination.current_page + 1
        : undefined,
    staleTime: Infinity,
  });
}

export function wishlistCountQueryOptions(locale: Locale) {
  return queryOptions({
    queryKey: wishlistQueryKeys.count(locale),
    queryFn: ({ signal }) => fetchWishlistCount({ locale, signal }),
    staleTime: Infinity,
  });
}
