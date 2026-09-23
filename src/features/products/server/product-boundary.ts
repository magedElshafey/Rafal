import "server-only";

import type { Locale } from "next-intl";
import { cache } from "react";

import { serverEnv } from "@/config/server-env";
import { getProductBySlugDto } from "@/features/products/api/product-api.server";
import { mapProductDetailsResponse } from "@/features/products/api/product-mappers";
import {
  getMockProductDetailsById,
  getMockProductDetailsBySlug,
} from "@/features/products/server/mock-product-catalog";
import type { ProductDetails } from "@/features/products/types/product-details.types";
import { ApiError } from "@/lib/api/api-error";

export type ProductDetailsSource = "laravel" | "mock";

export type ProductDetailsReadResult = {
  hasAuthoritativeStockContext: boolean;
  product: ProductDetails | null;
  source: ProductDetailsSource;
};

function assertMockProductSourceAvailable() {
  if (!serverEnv.useMockApi || process.env.NODE_ENV === "production") {
    throw new Error("The mock Product Details source is unavailable.");
  }
}

export const getProductDetailsBySlug = cache(async function getProductDetailsBySlug(
  slug: string,
  locale: Locale,
  cityId?: number,
): Promise<ProductDetailsReadResult> {
  if (serverEnv.useMockApi) {
    assertMockProductSourceAvailable();
    return {
      hasAuthoritativeStockContext: false,
      product: getMockProductDetailsBySlug(slug, locale),
      source: "mock",
    };
  }

  try {
    const response = await getProductBySlugDto({ cityId, slug });
    const product = mapProductDetailsResponse(response);

    if (!product) {
      throw new Error("The Product response could not be mapped.");
    }

    return {
      hasAuthoritativeStockContext: cityId !== undefined,
      product,
      source: "laravel",
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return {
        hasAuthoritativeStockContext: cityId !== undefined,
        product: null,
        source: "laravel",
      };
    }

    throw error;
  }
});

export async function getProductDetailsById(
  productId: string,
  locale: Locale,
): Promise<ProductDetails | null> {
  assertMockProductSourceAvailable();
  return getMockProductDetailsById(productId, locale);
}
