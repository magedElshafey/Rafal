import "server-only";

import type { Locale } from "next-intl";

import {
  parseProductReviewsResponse,
  ProductReviewsContractError,
} from "@/features/reviews/api/parse-product-reviews-dto";
import { mapProductReviewsResponse } from "@/features/reviews/api/product-reviews-mapper";
import { serverApi } from "@/lib/api/server-api";

export async function getProductReviews({
  productId,
  locale,
  page = 1,
  signal,
  retry,
}: {
  productId: string;
  locale: Locale;
  page?: number;
  signal?: AbortSignal;
  retry?: false;
}) {
  const payload = await serverApi.request<unknown>({
    path: `/products/${encodeURIComponent(productId)}/reviews`,
    headers: { "Accept-Language": locale },
    query: { page },
    signal,
    retry,
  });
  const parsed = parseProductReviewsResponse(payload);
  if (parsed.meta.current_page !== page) {
    throw new ProductReviewsContractError(
      "meta.current_page",
      "the requested page",
    );
  }
  return mapProductReviewsResponse(parsed);
}
