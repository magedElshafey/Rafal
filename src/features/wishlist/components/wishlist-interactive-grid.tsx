"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations, type Locale } from "next-intl";

import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/features/products/components/listing/product-grid";
import { useWishlistMutation } from "@/features/wishlist/hooks/use-wishlist-mutation";
import { wishlistQueryKeys } from "@/features/wishlist/api/wishlist-query-keys";
import { wishlistInfiniteQueryOptions } from "@/features/wishlist/api/wishlist-query";
import type { WishlistPage } from "@/features/wishlist/types/wishlist.types";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/api-error";
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
  accountId: string;
  copy: WishlistInteractiveGridCopy;
  initialPage: WishlistPage | null;
  locale: Locale;
};

function formatTemplate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replace(`{${key}}`, String(value)),
    template,
  );
}

export function WishlistInteractiveGrid({
  accountId,
  copy,
  initialPage,
  locale,
}: WishlistInteractiveGridProps) {
  const t = useTranslations("Account.wishlist");
  const queryClient = useQueryClient();
  const router = useRouter();
  const expiredRef = useRef(false);
  const [expired, setExpired] = useState(false);
  const handleUnauthorized = useCallback(() => {
    if (expiredRef.current) return;
    expiredRef.current = true;
    setExpired(true);
    const queryKey = wishlistQueryKeys.account(accountId);
    void queryClient.cancelQueries({ queryKey }).then(() => {
      queryClient.removeQueries({ queryKey });
      router.replace({
        pathname: "/login",
        query: { returnTo: "/account/wishlist", state: "session-expired" },
      });
    });
  }, [accountId, queryClient, router]);
  const mutation = useWishlistMutation({
    accountId,
    locale,
    onUnauthorized: handleUnauthorized,
    onFailure: () => rafalToast.error(copy.mutationError),
  });
  const query = useInfiniteQuery({
    ...wishlistInfiniteQueryOptions(accountId, locale),
    initialData: !expired && initialPage
      ? { pages: [initialPage], pageParams: [1] }
      : undefined,
    enabled: !expired,
  });
  const unauthorized =
    query.error instanceof ApiError && query.error.status === 401;
  useEffect(() => {
    if (unauthorized) handleUnauthorized();
  }, [unauthorized, handleUnauthorized]);

  const removeProduct = (productId: string) => {
    if (expiredRef.current || query.isFetching) return;
    mutation.setState({ productId, wishlisted: false });
  };

  if (query.isPending || expired || unauthorized) {
    return (
      <div aria-busy="true" aria-label={copy.loading}>
        <ProductGridSkeleton />
      </div>
    );
  }

  if (query.isError && (!query.data || !query.isFetchNextPageError)) {
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

  if (products.length === 0 && (mutation.isPending || query.isFetching)) {
    return (
      <div aria-busy="true" aria-label={copy.loading}>
        <ProductGridSkeleton />
      </div>
    );
  }

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
          const pending = mutation.isPending;
          return {
            "aria-busy": pending || undefined,
            "aria-pressed": true,
            disabled: pending || query.isFetching,
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
          disabled={mutation.isPending || query.isFetching}
          hasNextPage={query.hasNextPage === true}
          isLoading={query.isFetchingNextPage}
          label={query.isFetchNextPageError ? copy.error.retry : copy.loadMore}
          loadingLabel={copy.loadingMore}
          onClick={() => {
            if (!expiredRef.current && !mutation.isBusy() && !query.isFetching) {
              void query.fetchNextPage();
            }
          }}
        />
      </div>
    </div>
  );
}
