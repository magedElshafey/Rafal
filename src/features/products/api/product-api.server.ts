import "server-only";

import type { Locale } from "next-intl";

import type {
  ProductDetailsResponseDto,
  ProductListResponseDto,
} from "@/features/products/api/product-dto";
import {
  parseProductDetailsResponse,
  parseProductListResponse,
} from "@/features/products/api/parse-product-dto";
import {
  createProductListQuery,
  type ProductListQueryInput,
} from "@/features/products/api/product-api-query";
import { serverApi } from "@/lib/api/server-api";

export type GetProductsRequest = ProductListQueryInput & {
  locale: Locale;
  signal?: AbortSignal;
};

export async function getProductsDto({
  categoryId,
  cityId,
  locale,
  maxPrice,
  minPrice,
  newArrival,
  onDiscount,
  page,
  perPage,
  personalizable,
  search,
  signal,
  sort,
}: GetProductsRequest): Promise<ProductListResponseDto> {
  const payload = await serverApi.request<unknown>({
    path: "/products",
    headers: { "Accept-Language": locale },
    query: createProductListQuery({
      categoryId,
      cityId,
      maxPrice,
      minPrice,
      newArrival,
      onDiscount,
      page,
      perPage,
      personalizable,
      search,
      sort,
    }),
    signal,
  });

  return parseProductListResponse(payload);
}

export async function getProductBySlugDto({
  cityId,
  locale,
  signal,
  slug,
}: {
  cityId?: number;
  locale: Locale;
  signal?: AbortSignal;
  slug: string;
}): Promise<ProductDetailsResponseDto> {
  const payload = await serverApi.request<unknown>({
    path: `/products/${encodeURIComponent(slug)}`,
    headers: { "Accept-Language": locale },
    query: { city_id: cityId },
    signal,
  });

  return parseProductDetailsResponse(payload);
}
