import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { Locale } from "next-intl";

import { wishlistQueryKeys } from "@/features/wishlist/api/wishlist-query-keys";
import type { WishlistCount, WishlistPage } from "@/features/wishlist/types/wishlist.types";
import { ApiError } from "@/lib/api/api-error";
import { createHttpClient } from "@/lib/api/http-client";

function wishlistClient() {
  return createHttpClient({ baseUrl: new URL("/api/", window.location.origin) });
}

function retryRead(failureCount: number, error: Error): boolean {
  return !(error instanceof ApiError && error.status === 401) && failureCount < 1;
}

export function wishlistInfiniteQueryOptions(accountId: string, locale: Locale) {
  return infiniteQueryOptions({
    queryKey: wishlistQueryKeys.list(accountId, locale),
    queryFn: ({ pageParam, signal }) =>
      wishlistClient().request<WishlistPage>({
        path: "/wishlist",
        query: { locale, page: pageParam },
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.current_page < lastPage.pagination.last_page
        ? lastPage.pagination.current_page + 1
        : undefined,
    staleTime: Infinity,
    retry: retryRead,
  });
}

export function wishlistCountQueryOptions(accountId: string, locale: Locale) {
  return queryOptions({
    queryKey: wishlistQueryKeys.count(accountId, locale),
    queryFn: ({ signal }) =>
      wishlistClient().request<WishlistCount>({
        path: "/wishlist/count",
        query: { locale },
        signal,
      }),
    staleTime: Infinity,
    retry: retryRead,
  });
}
