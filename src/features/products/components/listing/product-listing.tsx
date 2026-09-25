"use client";

import { useState } from "react";
import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { RafalModal } from "@/components/ui/rafal-modal";
import {
  ListingFilters,
  type ListingFiltersCopy,
} from "@/features/products/components/listing/listing-filters";
import { ListingSortControl } from "@/features/products/components/listing/listing-sort";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/features/products/components/listing/product-grid";
import type {
  ListingSort,
  ListingSubcategoryOption,
  PaginatedListingProducts,
  ProductListingFilters,
} from "@/features/products/types/product-listing.types";
import { isListingPriceRangeValid } from "@/features/products/utils/listing-price-range";
import {
  parseListingSearchParams,
  updateListingSearchParams,
} from "@/features/products/utils/listing-search-params";
import { usePathname, useRouter } from "@/i18n/navigation";

export type ProductListingCopy = {
  badges: Record<"discount" | "new" | "personalization", string>;
  closeFilters: string;
  emptyDescription: string;
  emptyTitle: string;
  filterButton: string;
  filters: ListingFiltersCopy;
  initialErrorDescription: string;
  initialErrorTitle: string;
  loading: string;
  loadMore: string;
  loadingMore: string;
  nextPageError: string;
  rating: string;
  reviews: string;
  retry: string;
  sortLabel: string;
  sortOptions: Record<ListingSort, string>;
  unavailable: string;
};

type ProductListingProps = {
  copy: ProductListingCopy;
  getPage: (
    filters: ProductListingFilters,
    sort: ListingSort,
    page: number,
    signal?: AbortSignal,
  ) => Promise<PaginatedListingProducts>;
  getQueryKey: (
    filters: ProductListingFilters,
    sort: ListingSort,
  ) => QueryKey;
  getNextPageParam: (
    lastPage: PaginatedListingProducts,
  ) => number | undefined;
  locale: Locale;
  subcategoryOptions: readonly ListingSubcategoryOption[];
  total: number;
};

export function ProductListing({
  copy,
  getPage,
  getNextPageParam,
  getQueryKey,
  locale,
  subcategoryOptions,
  total,
}: ProductListingProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { filters, sort } = parseListingSearchParams(searchParams);
  const priceRangeIsValid = isListingPriceRangeValid(filters);

  const replaceParams = (
    updates: Partial<ProductListingFilters> & { sort?: ListingSort },
  ) => {
    const next = updateListingSearchParams(
      new URLSearchParams(searchParams),
      updates,
    );
    router.replace(next.size ? `${pathname}?${next.toString()}` : pathname, {
      scroll: false,
    });
  };

  const query = useInfiniteQuery({
    queryKey: getQueryKey(filters, sort),
    queryFn: ({ pageParam, signal }) =>
      getPage(filters, sort, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam,
    enabled: priceRangeIsValid,
  });
  const products = query.data?.pages.flatMap((page) => page.items) ?? [];
  const filtersElement = (
    <ListingFilters
      copy={copy.filters}
      filters={filters}
      onChange={replaceParams}
      subcategoryOptions={subcategoryOptions}
      total={total}
    />
  );

  return (
    <div className="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden self-start md:sticky md:top-8 md:block">
        {filtersElement}
      </aside>
      <div className="min-w-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            className="md:hidden"
            variant="outline"
            onClick={() => setFiltersOpen(true)}
          >
            {copy.filterButton}
          </Button>
          <ListingSortControl
            label={copy.sortLabel}
            options={copy.sortOptions}
            sort={sort}
            onChange={(value) => replaceParams({ sort: value })}
          />
        </div>
        {!priceRangeIsValid ? null : query.isPending ? (
          <div aria-busy="true" aria-label={copy.loading}>
            <ProductGridSkeleton />
          </div>
        ) : query.isError && !query.isFetchNextPageError ? (
          <ErrorState
            title={copy.initialErrorTitle}
            description={copy.initialErrorDescription}
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
            reviewsLabel={(count) =>
              copy.reviews.replace("{count}", String(count))
            }
            unavailableLabel={copy.unavailable}
          />
        )}
        {query.isFetchNextPageError ? (
          <p
            className="mt-6 text-center type-body text-destructive"
            role="alert"
          >
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
      <RafalModal
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title={copy.filterButton}
        closeLabel={copy.closeFilters}
        showClose
        className="sm:max-w-md"
      >
        {filtersElement}
      </RafalModal>
    </div>
  );
}
