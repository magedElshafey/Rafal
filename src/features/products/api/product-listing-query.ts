import type { Locale } from "next-intl";

import type {
  ListingSort,
  PaginatedListingProducts,
  ProductListingFilters,
} from "@/features/products/types/product-listing.types";
import { getNextPageParam } from "@/lib/api/pagination";

export const productListingQuery = {
  key: (
    locale: Locale,
    category: string,
    filters: ProductListingFilters,
    sort: ListingSort,
  ) => ["products", "listing", { locale, category, filters, sort }] as const,
  getNextPageParam: (lastPage: PaginatedListingProducts) =>
    getNextPageParam(lastPage.pagination),
};
