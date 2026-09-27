import type { Locale } from "next-intl";

import type {
  CatalogueListingSort,
  CatalogueProductFilters,
  PaginatedListingProducts,
} from "@/features/products/types/product-listing.types";
import { getNextPageParam } from "@/lib/api/pagination";

export const catalogueProductsQuery = {
  key: ({
    categoryId,
    cityId,
    filters,
    locale,
    search,
    sort,
  }: {
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
      { categoryId, cityId, filters, locale, search, sort },
    ] as const,
  getNextPageParam: (lastPage: PaginatedListingProducts) =>
    getNextPageParam(lastPage.pagination),
};
