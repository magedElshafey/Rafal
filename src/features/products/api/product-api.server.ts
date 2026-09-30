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
import { optionalAuthProductRead } from "@/features/products/api/optional-auth-product-read";

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
  const payload = await optionalAuthProductRead(locale, {
    path: "/products",
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
  const payload = await optionalAuthProductRead(locale, {
    path: `/products/${encodeURIComponent(slug)}`,
    query: { city_id: cityId },
    signal,
  });

  return parseProductDetailsResponse(payload);
}
