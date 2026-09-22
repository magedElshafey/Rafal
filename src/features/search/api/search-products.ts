import type { Locale } from "next-intl";

import {
  categoryProductSubcategoriesFixture,
  getCategoryProductSources,
} from "@/features/products/api/category-products-fixture";
import {
  createMockListingFacets,
  createMockProductListing,
  mapMockListingProducts,
} from "@/features/products/api/mock-product-listing";
import type {
  ListingSort,
  PaginatedListingProducts,
  ProductListingFacets,
  ProductListingFilters,
} from "@/features/products/types/product-listing.types";
import { normalizeSearchQuery } from "@/features/search/utils/normalize-search-query";

export type SearchProductsRequest = {
  filters: ProductListingFilters;
  locale: Locale;
  page: number;
  query: string;
  sort: ListingSort;
};

function getMatchingProducts(query: string, locale: Locale) {
  const normalizedQuery = normalizeSearchQuery(query, locale);

  if (!normalizedQuery) return [];

  return getCategoryProductSources(locale).filter(
    ({ compatibility, payload }) => {
    const subcategory = categoryProductSubcategoriesFixture.find(
        (item) => item.value === compatibility.subcategory,
    );
    const searchableText = [
        payload.name,
      ...(subcategory?.keywords[locale] ?? []),
    ]
      .join(" ")
      .toLocaleLowerCase(locale);

      return searchableText.includes(normalizedQuery);
    },
  );
}

export function getSearchListingFacets(
  query: string,
  locale: Locale,
): ProductListingFacets {
  const matchingProducts = getMatchingProducts(query, locale);

  return createMockListingFacets(
    mapMockListingProducts(matchingProducts),
    categoryProductSubcategoriesFixture.map((subcategory) => ({
      label: subcategory.label[locale],
      value: subcategory.value,
    })),
  );
}

export async function searchListingProducts(
  request: SearchProductsRequest,
  signal?: AbortSignal,
): Promise<PaginatedListingProducts> {
  signal?.throwIfAborted();
  const { filters, locale, page, query, sort } = request;

  return Promise.resolve(
    createMockProductListing({
      filters,
      page,
      products: getMatchingProducts(query, locale),
      sort,
    }),
  );
}
