import "server-only";

import { getProductsDto } from "@/features/products/api/product-api.server";
import { mapProductListResponse } from "@/features/products/api/product-mappers";
import type {
  CatalogueProductsRequest,
  PaginatedListingProducts,
} from "@/features/products/types/product-listing.types";

export async function getCatalogueProducts(
  request: CatalogueProductsRequest,
): Promise<PaginatedListingProducts> {
  const { categoryId, cityId, filters, page, sort } = request;
  const response = await getProductsDto({
    categoryId,
    cityId,
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
