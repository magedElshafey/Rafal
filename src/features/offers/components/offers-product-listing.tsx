"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { getOffersProducts } from "@/features/offers/api/get-offers-products";
import { offersProductsQuery } from "@/features/offers/api/offers-products-query";
import type { OfferOption } from "@/features/offers/types/offers.types";
import {
  parseOfferType,
  updateOfferSearchParams,
} from "@/features/offers/utils/offers-search-params";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/features/products/components/listing/product-grid";
import { usePathname, useRouter } from "@/i18n/navigation";

export type OffersProductListingCopy = {
  badges: Record<"discount" | "new" | "personalization", string>;
  emptyDescription: string;
  emptyTitle: string;
  errorDescription: string;
  errorTitle: string;
  filterLabel: string;
  loading: string;
  loadMore: string;
  loadingMore: string;
  nextPageError: string;
  rating: string;
  retry: string;
  unavailable: string;
};

type OffersProductListingProps = {
  copy: OffersProductListingCopy;
  locale: Locale;
  offerOptions: readonly OfferOption[];
};

export function OffersProductListing({
  copy,
  locale,
  offerOptions,
}: OffersProductListingProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const offer = parseOfferType(searchParams);
  const query = useInfiniteQuery({
    queryKey: offersProductsQuery.key(locale, offer),
    queryFn: ({ pageParam, signal }) =>
      getOffersProducts({ offer, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: offersProductsQuery.getNextPageParam,
  });
  const products = query.data?.pages.flatMap((page) => page.items) ?? [];

  const replaceSearchParams = (next: URLSearchParams) => {
    router.replace(next.size ? `${pathname}?${next.toString()}` : pathname, {
      scroll: false,
    });
  };

  return (
    <div>
      <div
        className="mb-6 flex max-w-full gap-2 overflow-x-auto pb-2"
        role="group"
        aria-label={copy.filterLabel}
      >
        {offerOptions.map((option) => {
          const selected = offer === option.value;

          return (
            <Button
              key={option.value}
              aria-pressed={selected}
              className="shrink-0"
              size="sm"
              variant={selected ? "primary" : "outline"}
              onClick={() =>
                replaceSearchParams(
                  updateOfferSearchParams(
                    new URLSearchParams(searchParams),
                    option.value,
                  ),
                )
              }
            >
              {option.label}
            </Button>
          );
        })}
      </div>

      {query.isPending ? (
        <div aria-busy="true" aria-label={copy.loading}>
          <ProductGridSkeleton />
        </div>
      ) : query.isError && !query.isFetchNextPageError ? (
        <ErrorState
          title={copy.errorTitle}
          description={copy.errorDescription}
          action={
            <Button onClick={() => void query.refetch()}>{copy.retry}</Button>
          }
        />
      ) : products.length === 0 ? (
        <ErrorState
          title={copy.emptyTitle}
          description={copy.emptyDescription}
        />
      ) : (
        <ProductGrid
          badgeLabels={copy.badges}
          locale={locale}
          products={products}
          ratingLabel={(value) =>
            copy.rating.replace("{value}", String(value))
          }
          unavailableLabel={copy.unavailable}
        />
      )}

      {query.isFetchNextPageError ? (
        <p className="mt-6 text-center type-body text-destructive" role="alert">
          {copy.nextPageError}
        </p>
      ) : null}

      <div className="mt-10 flex justify-center">
        <LoadMoreButton
          hasNextPage={query.hasNextPage === true}
          isLoading={query.isFetchingNextPage}
          label={query.isFetchNextPageError ? copy.retry : copy.loadMore}
          loadingLabel={copy.loadingMore}
          onClick={() => void query.fetchNextPage()}
        />
      </div>
    </div>
  );
}
