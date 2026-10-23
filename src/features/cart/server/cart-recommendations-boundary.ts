import "server-only";

import type { Locale } from "next-intl";
import { getCartRecommendationsDto } from "@/features/cart/api/cart-api.server";
import { resolveCartTransportIdentity } from "@/features/cart/server/cart-auth-context";
import type { CartRecommendations } from "@/features/cart/types/cart-recommendations.types";
import { mapRecommendationProducts } from "@/features/products/api/product-mappers";
import { ApiError } from "@/lib/api/api-error";

export async function getCartRecommendations(locale: Locale, signal?: AbortSignal): Promise<CartRecommendations> {
  const identity = await resolveCartTransportIdentity();
  const response = await getCartRecommendationsDto(identity, locale, signal);
  if (!response.success) {
    throw new ApiError({ status: 502, code: "recommendations-unavailable", message: "Cart recommendations request was unsuccessful." });
  }
  return {
    frequentlyOrderedWith: mapRecommendationProducts(response.data.frequently_ordered_with),
    related: mapRecommendationProducts(response.data.related),
  };
}
