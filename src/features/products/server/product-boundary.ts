import "server-only";

import type { Locale } from "next-intl";
import { cache } from "react";

import { getProductBySlugDto } from "@/features/products/api/product-api.server";
import { mapProductDetailsResponse } from "@/features/products/api/product-mappers";
import type { ProductDetails } from "@/features/products/types/product-details.types";
import { ApiError } from "@/lib/api/api-error";

export const getProductDetailsBySlug = cache(async function getProductDetailsBySlug(
  slug: string,
  locale: Locale,
  cityId?: number,
): Promise<ProductDetails | null> {
  try {
    const response = await getProductBySlugDto({ cityId, locale, slug });
    const product = mapProductDetailsResponse(response);

    if (!product) {
      throw new Error("The Product response could not be mapped.");
    }

    return product;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
});
