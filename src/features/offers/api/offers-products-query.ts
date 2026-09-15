import type { Locale } from "next-intl";

import type { OfferType } from "@/features/offers/types/offers.types";
import type { PaginatedListingProducts } from "@/features/products/types/product-listing.types";
import { getNextPageParam } from "@/lib/api/pagination";

export const offersProductsQuery = {
  key: (locale: Locale, offer: OfferType) =>
    ["products", "offers", { locale, offer }] as const,
  getNextPageParam: (lastPage: PaginatedListingProducts) =>
    getNextPageParam(lastPage.pagination),
};
