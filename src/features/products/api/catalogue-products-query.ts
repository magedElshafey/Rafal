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
    sort,
  }: {
    categoryId?: number;
    cityId: number | null;
    filters: CatalogueProductFilters;
    locale: Locale;
    sort: CatalogueListingSort;
  }) =>
    [
      "products",
      "catalogue",
      { categoryId, cityId, filters, locale, sort },
    ] as const,
  getNextPageParam: (lastPage: PaginatedListingProducts) =>
    getNextPageParam(lastPage.pagination),
};
