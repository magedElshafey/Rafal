import type { Locale } from "next-intl";

import {
  categoryProductsFixture,
  categoryProductSubcategoriesFixture,
} from "@/features/products/api/category-products-fixture";
import {
  createMockListingFacets,
  createMockProductListing,
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

  return categoryProductsFixture.filter((product) => {
    const subcategory = categoryProductSubcategoriesFixture.find(
      (item) => item.value === product.subcategory,
    );
    const searchableText = [
      product.name[locale],
      ...(subcategory?.keywords[locale] ?? []),
    ]
      .join(" ")
      .toLocaleLowerCase(locale);

    return searchableText.includes(normalizedQuery);
  });
}

export function getSearchListingFacets(
  query: string,
  locale: Locale,
): ProductListingFacets {
  const matchingProducts = getMatchingProducts(query, locale);

  return createMockListingFacets(
    matchingProducts,
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
