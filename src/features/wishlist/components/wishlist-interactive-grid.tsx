"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslations, type Locale } from "next-intl";

import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/features/products/components/listing/product-grid";
import { setWishlistState } from "@/features/wishlist/actions/set-wishlist-state";
import { wishlistQueryKeys } from "@/features/wishlist/api/wishlist-query-keys";
import { wishlistInfiniteQueryOptions } from "@/features/wishlist/api/wishlist-query";
import type {
  WishlistCount,
  WishlistPage,
} from "@/features/wishlist/types/wishlist.types";
import { Link } from "@/i18n/navigation";
import { rafalToast } from "@/lib/rafal-toast";

export type WishlistInteractiveGridCopy = {
  actions: {
    pending: string;
    remove: string;
    removeProduct: string;
  };
  badges: Record<"discount" | "new" | "personalization", string>;
  empty: {
    cta: string;
    description: string;
    title: string;
  };
  error: {
    description: string;
    retry: string;
    title: string;
  };
  loadMore: string;
  loading: string;
  loadingMore: string;
  mutationError: string;
  nextPageError: string;
  resultCount: string;
  unavailable: string;
};

type WishlistInteractiveGridProps = {
  copy: WishlistInteractiveGridCopy;
  initialPage: WishlistPage | null;
  locale: Locale;
};

type RemoveContext = {
  countWasCached: boolean;
  previousCount: WishlistCount | undefined;
  previousData: InfiniteData<WishlistPage, number> | undefined;
};

function formatTemplate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replace(`{${key}}`, String(value)),
    template,
  );
}

export function WishlistInteractiveGrid({
  copy,
  initialPage,
  locale,
}: WishlistInteractiveGridProps) {
  const t = useTranslations("Account.wishlist");
  const queryClient = useQueryClient();
  const pendingProductIdsRef = useRef(new Set<string>());
  const [pendingProductIds, setPendingProductIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const queryOptions = wishlistInfiniteQueryOptions(locale);
  const query = useInfiniteQuery({
    ...queryOptions,
    initialData: initialPage
      ? { pages: [initialPage], pageParams: [1] }
      : undefined,
  });
  const listQueryKey = wishlistQueryKeys.list(locale);
  const countQueryKey = wishlistQueryKeys.count(locale);

  const setPending = (productId: string, pending: boolean) => {
    if (pending) pendingProductIdsRef.current.add(productId);
    else pendingProductIdsRef.current.delete(productId);
    setPendingProductIds(new Set(pendingProductIdsRef.current));
  };

  const removeMutation = useMutation<void, Error, string, RemoveContext>({
    mutationKey: wishlistQueryKeys.mutation("remove"),
    scope: { id: "wishlist-removals" },
    mutationFn: async (productId) => {
      const result = await setWishlistState({
        locale,
        productId,
        wishlisted: false,
      });
      if (!result.ok) throw new Error(result.error.code);
    },
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: listQueryKey, exact: true });
      const previousData = queryClient.getQueryData<
        InfiniteData<WishlistPage, number>
      >(listQueryKey);
      const countWasCached =
        queryClient.getQueryState(countQueryKey) !== undefined;
      const previousCount = queryClient.getQueryData<WishlistCount>(
        countQueryKey,
      );

      queryClient.setQueryData<InfiniteData<WishlistPage, number>>(
        listQueryKey,
        (current) => {
          if (!current) return current;
          const containsProduct = current.pages.some((page) =>
            page.items.some((product) => product.id === productId),
          );
          if (!containsProduct) return current;

          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              items: page.items.filter((product) => product.id !== productId),
              pagination: {
                ...page.pagination,
                total: Math.max(0, page.pagination.total - 1),
              },
            })),
          };
        },
      );

      if (countWasCached && previousCount) {
        queryClient.setQueryData<WishlistCount>(countQueryKey, {
          count: Math.max(0, previousCount.count - 1),
        });
      }

      return { countWasCached, previousCount, previousData };
    },
    onError: (_error, _productId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(listQueryKey, context.previousData);
      }
      if (context?.countWasCached && context.previousCount) {
        queryClient.setQueryData(countQueryKey, context.previousCount);
      }
      rafalToast.error(copy.mutationError);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: listQueryKey,
        exact: true,
        type: "active",
      });
    },
    onSettled: (_data, _error, productId) => setPending(productId, false),
  });

  const removeProduct = (productId: string) => {
    if (pendingProductIdsRef.current.has(productId)) return;
    setPending(productId, true);
    removeMutation.mutate(productId);
  };

  if (query.isPending) {
    return (
      <div aria-busy="true" aria-label={copy.loading}>
        <ProductGridSkeleton />
      </div>
    );
  }

  if (query.isError && !query.data) {
    return (
      <ErrorState
        role="alert"
        title={copy.error.title}
        description={copy.error.description}
        action={
          <Button onClick={() => void query.refetch()}>
            {copy.error.retry}
          </Button>
        }
      />
    );
  }

  const pages = query.data?.pages ?? [];
  const products = Array.from(
    new Map(
      pages
        .flatMap((page) => page.items)
        .map((product) => [product.id, product]),
    ).values(),
  );
  const total = pages[0]?.pagination.total ?? 0;

  if (products.length === 0) {
    return (
      <EmptyState
        role="status"
        title={copy.empty.title}
        description={copy.empty.description}
      >
        <Link href="/products" className={`${buttonVariants()} mt-5`}>
          {copy.empty.cta}
        </Link>
      </EmptyState>
    );
  }

  return (
    <div>
      <p className="mb-5 type-body-sm text-gray-500">
        {formatTemplate(copy.resultCount, { count: total })}
      </p>
      <ProductGrid
        badgeLabels={copy.badges}
        getWishlistAction={(product) => {
          const pending = pendingProductIds.has(product.id);
          return {
            "aria-busy": pending || undefined,
            "aria-pressed": true,
            disabled: pending,
            label: pending
              ? copy.actions.pending
              : formatTemplate(copy.actions.removeProduct, {
                  name: product.name,
                }),
            onClick: () => removeProduct(product.id),
          };
        }}
        locale={locale}
        products={products}
        ratingLabel={(value) => t("rating", { value })}
        reviewsLabel={(count) => t("reviews", { count })}
        unavailableLabel={copy.unavailable}
      />
      {query.isFetchingNextPage ? (
        <div aria-busy="true" aria-label={copy.loadingMore} className="mt-8">
          <ProductGridSkeleton count={4} />
        </div>
      ) : null}
      {query.isFetchNextPageError ? (
        <p className="mt-6 text-center type-body text-destructive" role="alert">
          {copy.nextPageError}
        </p>
      ) : null}
      <div className="mt-10 flex justify-center">
        <LoadMoreButton
          disabled={pendingProductIds.size > 0}
          hasNextPage={query.hasNextPage === true}
          isLoading={query.isFetchingNextPage}
          label={query.isFetchNextPageError ? copy.error.retry : copy.loadMore}
          loadingLabel={copy.loadingMore}
          onClick={() => {
            if (!query.isFetchingNextPage) void query.fetchNextPage();
          }}
        />
      </div>
    </div>
  );
}
