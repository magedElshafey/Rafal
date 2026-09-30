import type { Locale } from "next-intl";

import { createProductListQuery } from "@/features/products/api/product-api-query";
import type {
  CatalogueProductsRequest,
  PaginatedListingProducts,
} from "@/features/products/types/product-listing.types";
import { createHttpClient } from "@/lib/api/http-client";

type GetCatalogueProductsClientRequest = CatalogueProductsRequest & {
  locale: Locale;
  signal?: AbortSignal;
};

export async function getCatalogueProductsClient({
  categoryId,
  cityId,
  filters,
  locale,
  page,
  perPage,
  search,
  signal,
  sort,
}: GetCatalogueProductsClientRequest): Promise<PaginatedListingProducts> {
  const api = createHttpClient({
    baseUrl: new URL("/api/", window.location.origin),
    getDefaultHeaders: () => ({ "Accept-Language": locale }),
  });
  return api.request<PaginatedListingProducts>({
    path: "/products",
    query: createProductListQuery({
      categoryId,
      cityId,
      maxPrice: filters.maxPrice,
      minPrice: filters.minPrice,
      newArrival: filters.newArrival,
      onDiscount: filters.onDiscount,
      page,
      perPage,
      personalizable: filters.personalizable,
      search,
      sort,
    }),
    signal,
  });
}
