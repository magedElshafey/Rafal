"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { RafalModal } from "@/components/ui/rafal-modal";
import { catalogueProductsQuery } from "@/features/products/api/catalogue-products-query";
import { getCatalogueProductsClient } from "@/features/products/api/get-catalogue-products.client";
import { ListingSortControl } from "@/features/products/components/listing/listing-sort";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/features/products/components/listing/product-grid";
import type {
  CatalogueListingSort,
  CatalogueProductFilters,
  CatalogueSubcategoryOption,
  PaginatedListingProducts,
} from "@/features/products/types/product-listing.types";
import {
  type CatalogueListingSearchUpdate,
  updateCatalogueListingSearchParams,
} from "@/features/products/utils/catalogue-listing-search-params";
import { isListingPriceRangeValid } from "@/features/products/utils/listing-price-range";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type CatalogueProductListingCopy = {
  badges: Record<"discount" | "new" | "personalization", string>;
  closeFilters: string;
  emptyDescription: string;
  emptyTitle: string;
  filterButton: string;
  loading: string;
  loadingMore: string;
  loadMore: string;
  nextPageError: string;
  filters: {
    additional: string;
    invalidPriceRange: string;
    maxPrice: string;
    minPrice: string;
    newArrival: string;
    onDiscount: string;
    personalizable: string;
    priceRange: string;
    all?: string;
    subcategories?: string;
  };
  rating: string;
  retry: string;
  reviews: string;
  sortLabel: string;
  sortOptions: Record<CatalogueListingSort, string>;
  unavailable: string;
};

type Props = {
  categoryId?: number;
  cityId: number | null;
  copy: CatalogueProductListingCopy;
  filters: CatalogueProductFilters;
  listing: PaginatedListingProducts | null;
  locale: Locale;
  sort: CatalogueListingSort;
  subcategoryOptions?: readonly CatalogueSubcategoryOption[];
};

type CatalogueFiltersProps = {
  copy: CatalogueProductListingCopy["filters"];
  filters: CatalogueProductFilters;
  onChange: (updates: Partial<CatalogueProductFilters>) => void;
  onPriceChange: (
    updates: Pick<CatalogueProductFilters, "maxPrice" | "minPrice">,
  ) => void;
  priceDraftKey: string;
  subcategoryOptions?: readonly CatalogueSubcategoryOption[];
};

type PriceRangeFiltersProps = {
  copy: CatalogueProductListingCopy["filters"];
  filters: Pick<CatalogueProductFilters, "maxPrice" | "minPrice">;
  onChange: (
    updates: Pick<CatalogueProductFilters, "maxPrice" | "minPrice">,
  ) => void;
};

const priceCommitDelayMs = 400;

function formatPriceDraft(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function parsePriceDraft(value: string): number | undefined | null {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function PriceRangeFilters({
  copy,
  filters,
  onChange,
}: PriceRangeFiltersProps) {
  const errorId = useId();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [minDraft, setMinDraft] = useState(() =>
    formatPriceDraft(filters.minPrice),
  );
  const [maxDraft, setMaxDraft] = useState(() =>
    formatPriceDraft(filters.maxPrice),
  );
  const [minDraftIsInvalid, setMinDraftIsInvalid] = useState(false);
  const [maxDraftIsInvalid, setMaxDraftIsInvalid] = useState(false);

  const cancelPendingCommit = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const commit = (resetInvalid = false) => {
    cancelPendingCommit();
    const minPrice = parsePriceDraft(minDraft);
    const maxPrice = parsePriceDraft(maxDraft);

    if (
      minDraftIsInvalid ||
      maxDraftIsInvalid ||
      minPrice === null ||
      maxPrice === null
    ) {
      if (resetInvalid) {
        setMinDraft(formatPriceDraft(filters.minPrice));
        setMaxDraft(formatPriceDraft(filters.maxPrice));
        setMinDraftIsInvalid(false);
        setMaxDraftIsInvalid(false);
      }
      return;
    }

    if (minPrice === filters.minPrice && maxPrice === filters.maxPrice) return;
    onChange({ maxPrice, minPrice });
  };

  useEffect(() => {
    cancelPendingCommit();
    const minPrice = parsePriceDraft(minDraft);
    const maxPrice = parsePriceDraft(maxDraft);
    if (
      minDraftIsInvalid ||
      maxDraftIsInvalid ||
      minPrice === null ||
      maxPrice === null
    ) {
      return;
    }
    if (minPrice === filters.minPrice && maxPrice === filters.maxPrice) return;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onChange({ maxPrice, minPrice });
    }, priceCommitDelayMs);

    return cancelPendingCommit;
  }, [
    cancelPendingCommit,
    filters.maxPrice,
    filters.minPrice,
    maxDraftIsInvalid,
    maxDraft,
    minDraftIsInvalid,
    minDraft,
    onChange,
  ]);

  const parsedMin = parsePriceDraft(minDraft);
  const parsedMax = parsePriceDraft(maxDraft);
  const rangeIsInvalid =
    !minDraftIsInvalid &&
    !maxDraftIsInvalid &&
    parsedMin !== null &&
    parsedMax !== null &&
    parsedMin !== undefined &&
    parsedMax !== undefined &&
    parsedMin > parsedMax;
  const handleEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commit();
  };

  return (
    <fieldset>
      <legend className="text-h4 font-medium">{copy.priceRange}</legend>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <input
          aria-label={copy.minPrice}
          aria-describedby={rangeIsInvalid ? errorId : undefined}
          aria-invalid={rangeIsInvalid || undefined}
          className={cn(
            "h-11 min-w-0 rounded-md border border-border px-3 type-body outline-none focus:border-gold-500",
            rangeIsInvalid && "border-destructive",
          )}
          inputMode="decimal"
          min="0"
          placeholder={copy.minPrice}
          step="any"
          type="number"
          value={minDraft}
          onBlur={() => commit(true)}
          onChange={(event) => {
            setMinDraft(event.target.value);
            setMinDraftIsInvalid(
              event.target.validity.badInput ||
                event.target.validity.rangeUnderflow,
            );
          }}
          onKeyDown={handleEnter}
        />
        <input
          aria-label={copy.maxPrice}
          aria-describedby={rangeIsInvalid ? errorId : undefined}
          aria-invalid={rangeIsInvalid || undefined}
          className={cn(
            "h-11 min-w-0 rounded-md border border-border px-3 type-body outline-none focus:border-gold-500",
            rangeIsInvalid && "border-destructive",
          )}
          inputMode="decimal"
          min="0"
          placeholder={copy.maxPrice}
          step="any"
          type="number"
          value={maxDraft}
          onBlur={() => commit(true)}
          onChange={(event) => {
            setMaxDraft(event.target.value);
            setMaxDraftIsInvalid(
              event.target.validity.badInput ||
                event.target.validity.rangeUnderflow,
            );
          }}
          onKeyDown={handleEnter}
        />
      </div>
      {rangeIsInvalid ? (
        <p
          id={errorId}
          className="mt-2 type-body-sm text-destructive"
          role="alert"
        >
          {copy.invalidPriceRange}
        </p>
      ) : null}
    </fieldset>
  );
}

function CatalogueFilters({
  copy,
  filters,
  onChange,
  onPriceChange,
  priceDraftKey,
  subcategoryOptions,
}: CatalogueFiltersProps) {
  return (
    <div className="space-y-6">
      {subcategoryOptions?.length && copy.subcategories && copy.all ? (
        <fieldset>
          <legend className="text-h4 font-medium">{copy.subcategories}</legend>
          <div className="mt-3 space-y-2 type-body">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                className="accent-gold-500"
                type="radio"
                name="subcategory"
                checked={!filters.subcategory}
                onChange={() => onChange({ subcategory: undefined })}
              />
              <span>{copy.all}</span>
            </label>
            {subcategoryOptions.map(({ label, value }) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  className="accent-gold-500"
                  type="radio"
                  name="subcategory"
                  checked={filters.subcategory === value}
                  onChange={() => onChange({ subcategory: value })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <PriceRangeFilters
        key={priceDraftKey}
        copy={copy}
        filters={filters}
        onChange={onPriceChange}
      />
      <fieldset className="border-t border-border pt-6">
        <legend className="text-h4 font-medium">{copy.additional}</legend>
        <div className="mt-3 space-y-3">
          <label className="flex cursor-pointer items-center gap-3 type-body">
            <Checkbox
              checked={filters.onDiscount}
              onCheckedChange={(checked) =>
                onChange({ onDiscount: checked === true })
              }
            />
            {copy.onDiscount}
          </label>
          <label className="flex cursor-pointer items-center gap-3 type-body">
            <Checkbox
              checked={filters.personalizable}
              onCheckedChange={(checked) =>
                onChange({ personalizable: checked === true })
              }
            />
            {copy.personalizable}
          </label>
          <label className="flex cursor-pointer items-center gap-3 type-body">
            <Checkbox
              checked={filters.newArrival}
              onCheckedChange={(checked) =>
                onChange({ newArrival: checked === true })
              }
            />
            {copy.newArrival}
          </label>
        </div>
      </fieldset>
    </div>
  );
}

export function CatalogueProductListing({
  categoryId,
  cityId,
  copy,
  filters,
  listing,
  locale,
  sort,
  subcategoryOptions,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceDraftResetRevision, setPriceDraftResetRevision] = useState(0);
  const [isNavigationPending, startNavigation] = useTransition();
  const priceRangeIsValid = isListingPriceRangeValid(filters);

  const navigate = useCallback(
    (
      update: CatalogueListingSearchUpdate,
      history: "push" | "replace" = "push",
      resetPriceDraft = true,
    ) => {
      const current = new URLSearchParams(searchParams);
      const next = updateCatalogueListingSearchParams(current, update);
      if (next.toString() === current.toString()) return;
      const href = next.size ? `${pathname}?${next.toString()}` : pathname;

      if (resetPriceDraft) {
        setPriceDraftResetRevision((revision) => revision + 1);
      }
      startNavigation(() => {
        if (history === "replace") router.replace(href, { scroll: false });
        else router.push(href, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );
  const commitPrice = useCallback(
    (updates: Pick<CatalogueProductFilters, "maxPrice" | "minPrice">) =>
      navigate(updates, "replace", false),
    [navigate],
  );

  const query = useInfiniteQuery({
    queryKey: catalogueProductsQuery.key({
      categoryId,
      cityId,
      filters,
      locale,
      sort,
    }),
    queryFn: ({ pageParam, signal }) =>
      getCatalogueProductsClient({
        categoryId,
        cityId,
        filters,
        locale,
        page: pageParam,
        signal,
        sort,
      }),
    initialData: listing
      ? { pages: [listing], pageParams: [1] }
      : undefined,
    initialPageParam: 1,
    getNextPageParam: catalogueProductsQuery.getNextPageParam,
    enabled: listing !== null && priceRangeIsValid,
    staleTime: Infinity,
  });
  const products = useMemo(
    () =>
      Array.from(
        new Map(
          (query.data?.pages.flatMap((page) => page.items) ?? []).map(
            (product) => [product.id, product],
          ),
        ).values(),
      ),
    [query.data?.pages],
  );
  const priceDraftKey = JSON.stringify([
    categoryId ?? null,
    cityId,
    locale,
    sort,
    filters.subcategory ?? null,
    filters.minPrice ?? null,
    filters.maxPrice ?? null,
    filters.onDiscount,
    filters.personalizable,
    filters.newArrival,
    priceDraftResetRevision,
  ]);

  const filtersElement = (
    <CatalogueFilters
      copy={copy.filters}
      filters={filters}
      onChange={navigate}
      onPriceChange={commitPrice}
      priceDraftKey={priceDraftKey}
      subcategoryOptions={subcategoryOptions}
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
            onChange={(value) => navigate({ sort: value })}
          />
        </div>
        {isNavigationPending ? (
          <div aria-busy="true" aria-label={copy.loading}>
            <ProductGridSkeleton />
          </div>
        ) : listing === null ? (
          <EmptyState title={copy.filters.invalidPriceRange} role="status" />
        ) : products.length === 0 ? (
          <EmptyState
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
        {!isNavigationPending && query.isFetchingNextPage ? (
          <div aria-busy="true" aria-label={copy.loadingMore} className="mt-8">
            <ProductGridSkeleton count={4} />
          </div>
        ) : null}
        {!isNavigationPending && query.isFetchNextPageError ? (
          <p className="mt-6 text-center type-body text-destructive" role="alert">
            {copy.nextPageError}
          </p>
        ) : null}
        {!isNavigationPending && listing !== null ? (
          <div className="mt-10 flex justify-center">
            <LoadMoreButton
              hasNextPage={query.hasNextPage === true}
              isLoading={query.isFetchingNextPage}
              label={query.isFetchNextPageError ? copy.retry : copy.loadMore}
              loadingLabel={copy.loadingMore}
              onClick={() => {
                if (!query.isFetchingNextPage) void query.fetchNextPage();
              }}
            />
          </div>
        ) : null}
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
