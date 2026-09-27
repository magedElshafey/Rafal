import type { Locale } from "next-intl";

import { getCatalogueProductsClient } from "@/features/products/api/get-catalogue-products.client";
import type { ListingProduct } from "@/features/products/types/product-listing.types";

export const productSearchAutocompleteLimit = 6;

const autocompleteFilters = {
  newArrival: false,
  onDiscount: false,
  personalizable: false,
} as const;

export const productSearchAutocompleteQuery = {
  key: ({
    cityId,
    locale,
    search,
  }: {
    cityId: number | null;
    locale: Locale;
    search: string;
  }) =>
    [
      "products",
      "autocomplete",
      { cityId, locale, perPage: productSearchAutocompleteLimit, search },
    ] as const,
  fetch: async ({
    cityId,
    locale,
    search,
    signal,
  }: {
    cityId: number | null;
    locale: Locale;
    search: string;
    signal?: AbortSignal;
  }): Promise<readonly ListingProduct[]> => {
    const listing = await getCatalogueProductsClient({
      cityId,
      filters: autocompleteFilters,
      locale,
      page: 1,
      perPage: productSearchAutocompleteLimit,
      search,
      signal,
      sort: "relevance",
    });

    return listing.items;
  },
};
