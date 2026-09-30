import type { Locale } from "next-intl";

import type { PaginatedListingProducts } from "@/features/products/types/product-listing.types";
import { getNextPageParam } from "@/lib/api/pagination";

export const offersProductsQuery = {
  account: (accountId: string | null) =>
    ["offers", "discounted-products", accountId] as const,
  key: (accountId: string | null, locale: Locale, cityId: number | null) =>
    ["offers", "discounted-products", accountId, locale, cityId] as const,
  getNextPageParam: (lastPage: PaginatedListingProducts) =>
    getNextPageParam(lastPage.pagination),
};
