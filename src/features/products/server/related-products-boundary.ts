import "server-only";

import type { Locale } from "next-intl";
import { getRelatedProductsDto } from "@/features/products/api/product-api.server";
import { mapRecommendationProducts } from "@/features/products/api/product-mappers";
import type { ListingProduct } from "@/features/products/types/product-listing.types";
import { ApiError } from "@/lib/api/api-error";

// Failures propagate to the future isolated section, never become empty success.
export async function getRelatedProducts(
  slug: string,
  locale: Locale,
  cityId?: number,
  signal?: AbortSignal,
): Promise<readonly ListingProduct[]> {
  const response = await getRelatedProductsDto({ slug, locale, cityId, signal });
  if (!response.success) {
    throw new ApiError({ status: 502, code: "recommendations-unavailable", message: "Related products request was unsuccessful." });
  }
  return mapRecommendationProducts(response.data);
}
