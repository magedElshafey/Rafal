import {
  dehydrate,
  HydrationBoundary,
  type InfiniteData,
  QueryClient,
} from "@tanstack/react-query";
import { getLocale, getTranslations } from "next-intl/server";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import type { ProductListingCopy } from "@/features/products/components/listing/product-listing";
import type { PaginatedListingProducts } from "@/features/products/types/product-listing.types";
import { isListingPriceRangeValid } from "@/features/products/utils/listing-price-range";
import { parseListingSearchParams } from "@/features/products/utils/listing-search-params";
import { searchProductListingQuery } from "@/features/search/api/search-product-listing-query";
import {
  getSearchListingFacets,
  searchListingProducts,
} from "@/features/search/api/search-products";
import { SearchProductListing } from "@/features/search/components/search-product-listing";
import { cleanSearchQuery } from "@/features/search/utils/normalize-search-query";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const [rawSearchParams, locale, t, tListing] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations("Common.searchResults"),
    getTranslations("Common.productListing"),
  ]);
  const urlSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(rawSearchParams)) {
    if (typeof value === "string") urlSearchParams.set(key, value);
    else value?.forEach((item) => urlSearchParams.append(key, item));
  }

  const query = cleanSearchQuery(urlSearchParams.get("q") ?? "");
  const { filters, sort } = parseListingSearchParams(urlSearchParams);
  const priceRangeIsValid = isListingPriceRangeValid(filters);
  const firstPage =
    query && priceRangeIsValid
      ? await searchListingProducts({
          filters,
          locale,
          page: 1,
          query,
          sort,
        })
      : undefined;
  const facets = query
    ? getSearchListingFacets(query, locale)
    : { subcategoryOptions: [], total: 0 };
  const queryClient = new QueryClient();

  if (firstPage) {
    queryClient.setQueryData<InfiniteData<PaginatedListingProducts>>(
      searchProductListingQuery.key(locale, query, filters, sort),
      { pages: [firstPage], pageParams: [1] },
    );
  }

  const listingCopy: ProductListingCopy = {
    badges: {
      discount: tListing("badges.discount"),
      new: tListing("badges.new"),
      personalization: tListing("badges.personalization"),
    },
    closeFilters: tListing("closeFilters"),
    emptyDescription: t("noResultsDescription", { query }),
    emptyTitle: t("noResultsTitle"),
    filterButton: tListing("filterButton"),
    filters: {
      additional: tListing("filters.additional"),
      all: tListing("filters.all"),
      available: tListing("filters.available"),
      invalidPriceRange: tListing("filters.invalidPriceRange"),
      maxPrice: tListing("filters.maxPrice"),
      minPrice: tListing("filters.minPrice"),
      personalizable: tListing("filters.personalizable"),
      priceRange: tListing("filters.priceRange"),
      subcategories: tListing("filters.subcategories"),
    },
    initialErrorDescription: t("errorDescription"),
    initialErrorTitle: t("errorTitle"),
    loading: tListing("loading"),
    loadMore: tListing("loadMore"),
    loadingMore: tListing("loadingMore"),
    nextPageError: tListing("nextPageError"),
    rating: tListing.raw("rating") as string,
    reviews: tListing.raw("reviews") as string,
    retry: tListing("retry"),
    sortLabel: tListing("sort.label"),
    sortOptions: {
      "best-selling": tListing("sort.bestSelling"),
      "price-asc": tListing("sort.priceAsc"),
      "price-desc": tListing("sort.priceDesc"),
      newest: tListing("sort.newest"),
    },
    unavailable: tListing("unavailable"),
  };

  return (
    <Container className="main-content-spacing pb-12">
      <Breadcrumbs
        label={t("breadcrumbs.label")}
        items={[
          { label: t("breadcrumbs.home"), href: "/" },
          { label: t("breadcrumbs.search") },
        ]}
      />
      <div className="mt-5 min-w-0">
        <h1 className="text-h1 font-bold text-foreground">{t("title")}</h1>
        {query ? (
          <p className="mt-1 break-words type-body-sm text-muted-foreground [overflow-wrap:anywhere]">
            {t("summary", {
              count: firstPage?.pagination.total ?? facets.total,
              query,
            })}
          </p>
        ) : null}
      </div>
      <div className="mt-6">
        {query ? (
          <HydrationBoundary state={dehydrate(queryClient)}>
            <SearchProductListing
              copy={listingCopy}
              locale={locale}
              query={query}
              subcategoryOptions={facets.subcategoryOptions}
              total={facets.total}
            />
          </HydrationBoundary>
        ) : (
          <ErrorState
            title={t("emptyQueryTitle")}
            description={t("emptyQueryDescription")}
          />
        )}
      </div>
    </Container>
  );
}
