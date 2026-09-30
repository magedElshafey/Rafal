"use client";

import {
  useIsMutating,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useRef } from "react";
import type { Locale } from "next-intl";

import { setWishlistState } from "@/features/wishlist/actions/set-wishlist-state";
import { wishlistQueryKeys } from "@/features/wishlist/api/wishlist-query-keys";
import type {
  WishlistCount,
  WishlistPage,
} from "@/features/wishlist/types/wishlist.types";
import { ApiError } from "@/lib/api/api-error";

type WishlistChange = { productId: string; wishlisted: boolean };
type MutationSnapshot = {
  list: InfiniteData<WishlistPage, number> | undefined;
  count: WishlistCount | undefined;
};

export function useWishlistMutation({
  accountId,
  locale,
  onUnauthorized,
  onFailure,
}: {
  accountId: string;
  locale: Locale;
  onUnauthorized: () => void;
  onFailure: () => void;
}) {
  const queryClient = useQueryClient();
  const locked = useRef(false);
  const mutationKey = wishlistQueryKeys.mutation(accountId);
  const listKey = wishlistQueryKeys.list(accountId, locale);
  const countKey = wishlistQueryKeys.count(accountId, locale);
  const pendingCount = useIsMutating({ mutationKey, exact: true });

  const mutation = useMutation<
    WishlistChange,
    ApiError,
    WishlistChange,
    MutationSnapshot
  >({
    mutationKey,
    retry: false,
    mutationFn: async (change) => {
      try {
        const result = await setWishlistState({ ...change, locale });
        if (!result.ok) {
          throw new ApiError({
            status:
              result.error.code === "unauthorized" ? 401
                : result.error.code === "invalid-input" ? 400 : 503,
            code: result.error.code,
            message: "Wishlist update failed.",
          });
        }
        return change;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError({
          status: 503,
          code: "service-unavailable",
          message: "Wishlist update failed.",
        });
      }
    },
    onMutate: async ({ productId, wishlisted }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listKey, exact: true }),
        queryClient.cancelQueries({ queryKey: countKey, exact: true }),
      ]);
      const list = queryClient.getQueryData<InfiniteData<WishlistPage, number>>(listKey);
      const count = queryClient.getQueryData<WishlistCount>(countKey);
      const containsProduct = list?.pages.some((page) =>
        page.items.some((product) => product.id === productId),
      );

      if (!wishlisted && containsProduct && list) {
        queryClient.setQueryData<InfiniteData<WishlistPage, number>>(listKey, {
          ...list,
          pages: list.pages.map((page) => {
            const total = Math.max(0, page.pagination.total - 1);
            return {
              ...page,
              items: page.items.filter((product) => product.id !== productId),
              pagination: {
                ...page.pagination,
                total,
                last_page: Math.max(1, Math.ceil(total / page.pagination.per_page)),
              },
            };
          }),
        });
        if (count) {
          queryClient.setQueryData<WishlistCount>(countKey, {
            count: Math.max(0, count.count - 1),
          });
        }
      }
      return { list, count };
    },
    onError: (error, _change, snapshot) => {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      if (snapshot?.list) queryClient.setQueryData(listKey, snapshot.list);
      if (snapshot?.count) queryClient.setQueryData(countKey, snapshot.count);
      onFailure();
    },
    onSuccess: async () => {
      // The unused count query is marked stale without issuing a count request.
      await queryClient.invalidateQueries({
        queryKey: countKey, exact: true, refetchType: "none",
      });
      await queryClient.invalidateQueries({
        queryKey: listKey, exact: true, refetchType: "active",
      });
    },
    onSettled: () => {
      locked.current = false;
    },
  });

  const isBusy = () =>
    locked.current || queryClient.isMutating({ mutationKey, exact: true }) > 0;
  const setState = (change: WishlistChange): boolean => {
    // Reject overlap BEFORE onMutate can capture another optimistic snapshot.
    if (isBusy() || queryClient.isFetching({ queryKey: listKey, exact: true }) > 0) {
      return false;
    }
    locked.current = true;
    mutation.mutate(change);
    return true;
  };

  return {
    isPending: mutation.isPending || pendingCount > 0,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
    variables: mutation.variables,
    isBusy,
    setState,
  };
}
