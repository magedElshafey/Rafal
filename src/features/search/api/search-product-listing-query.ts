import type { Locale } from "next-intl";

import type {
  ListingSort,
  PaginatedListingProducts,
  ProductListingFilters,
} from "@/features/products/types/product-listing.types";
import { normalizeSearchQuery } from "@/features/search/utils/normalize-search-query";
import { getNextPageParam } from "@/lib/api/pagination";

export const searchProductListingQuery = {
  key: (
    locale: Locale,
    query: string,
    filters: ProductListingFilters,
    sort: ListingSort,
  ) =>
    [
      "products",
      "search",
      { locale, query: normalizeSearchQuery(query, locale), filters, sort },
    ] as const,
  getNextPageParam: (lastPage: PaginatedListingProducts) =>
    getNextPageParam(lastPage.pagination),
};
