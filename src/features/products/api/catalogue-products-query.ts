import type { Locale } from "next-intl";

import type {
  CatalogueListingSort,
  CatalogueProductFilters,
  PaginatedListingProducts,
} from "@/features/products/types/product-listing.types";
import { getNextPageParam } from "@/lib/api/pagination";

export const catalogueProductsQuery = {
  account: (accountId: string | null) => ["products", "catalogue", accountId] as const,
  key: ({
    accountId,
    categoryId,
    cityId,
    filters,
    locale,
    search,
    sort,
  }: {
    accountId: string | null;
    categoryId?: number;
    cityId: number | null;
    filters: CatalogueProductFilters;
    locale: Locale;
    search?: string;
    sort: CatalogueListingSort;
  }) =>
    [
      "products",
      "catalogue",
      accountId,
      { categoryId, cityId, filters, locale, search, sort },
    ] as const,
  getNextPageParam: (lastPage: PaginatedListingProducts) =>
    getNextPageParam(lastPage.pagination),
};
