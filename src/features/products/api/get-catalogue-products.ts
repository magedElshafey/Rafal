import "server-only";

import type { Locale } from "next-intl";

import { getProductsDto } from "@/features/products/api/product-api.server";
import { mapProductListResponse } from "@/features/products/api/product-mappers";
import type {
  CatalogueProductsRequest,
  PaginatedListingProducts,
} from "@/features/products/types/product-listing.types";

type GetCatalogueProductsServerRequest = CatalogueProductsRequest & {
  locale: Locale;
};

export async function getCatalogueProducts(
  request: GetCatalogueProductsServerRequest,
): Promise<PaginatedListingProducts> {
  const { categoryId, cityId, filters, locale, page, sort } = request;
  const response = await getProductsDto({
    categoryId,
    cityId,
    locale,
    maxPrice: filters.maxPrice,
    minPrice: filters.minPrice,
    newArrival: filters.newArrival,
    onDiscount: filters.onDiscount,
    page,
    personalizable: filters.personalizable,
    sort,
  });

  return mapProductListResponse(response);
}
