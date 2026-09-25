import type { Locale } from "next-intl";

import { createProductListQuery } from "@/features/products/api/product-api-query";
import { mapProductListResponse } from "@/features/products/api/product-mappers";
import { parseProductListResponse } from "@/features/products/api/parse-product-dto";
import type {
  CatalogueProductsRequest,
  PaginatedListingProducts,
} from "@/features/products/types/product-listing.types";
import { createClientApi } from "@/lib/api/client-api";

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
  signal,
  sort,
}: GetCatalogueProductsClientRequest): Promise<PaginatedListingProducts> {
  const payload = await createClientApi(locale).request<unknown>({
    path: "/products",
    query: createProductListQuery({
      categoryId,
      cityId,
      maxPrice: filters.maxPrice,
      minPrice: filters.minPrice,
      newArrival: filters.newArrival,
      onDiscount: filters.onDiscount,
      page,
      personalizable: filters.personalizable,
      sort,
    }),
    signal,
  });

  return mapProductListResponse(parseProductListResponse(payload));
}
