import "server-only";

import type {
  ProductDetailsResponseDto,
  ProductListResponseDto,
} from "@/features/products/api/product-dto";
import {
  parseProductDetailsResponse,
  parseProductListResponse,
} from "@/features/products/api/parse-product-dto";
import { serverApi } from "@/lib/api/server-api";

export type GetProductsRequest = {
  cityId?: number;
  page?: number;
  search?: string;
  signal?: AbortSignal;
};

export async function getProductsDto({
  cityId,
  page,
  search,
  signal,
}: GetProductsRequest = {}): Promise<ProductListResponseDto> {
  const payload = await serverApi.request<unknown>({
    path: "/products",
    query: {
      city_id: cityId,
      page,
      search: search?.trim() || undefined,
    },
    signal,
  });

  return parseProductListResponse(payload);
}

export async function getProductBySlugDto({
  cityId,
  signal,
  slug,
}: {
  cityId?: number;
  signal?: AbortSignal;
  slug: string;
}): Promise<ProductDetailsResponseDto> {
  const payload = await serverApi.request<unknown>({
    path: `/products/${encodeURIComponent(slug)}`,
    query: { city_id: cityId },
    signal,
  });

  return parseProductDetailsResponse(payload);
}
