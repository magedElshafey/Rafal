import type { Locale } from "next-intl";

import type { ProductReviewsPage } from "@/features/reviews/types/product-review.types";
import { getNextReviewPage } from "@/features/reviews/utils/review-pagination";
import { createHttpClient } from "@/lib/api/http-client";

export async function getProductReviewsClient({
  productId,
  page,
  locale,
  signal,
}: {
  productId: string;
  page: number;
  locale: Locale;
  signal?: AbortSignal;
}): Promise<ProductReviewsPage> {
  if (!Number.isSafeInteger(page) || page < 2) {
    throw new Error("Only subsequent review pages may be loaded here");
  }
  const api = createHttpClient({
    baseUrl: new URL("/api/", window.location.origin),
    maxRetries: 0,
  });
  const result = await api.request<ProductReviewsPage>({
    path: `/products/${encodeURIComponent(productId)}/reviews`,
    query: { page },
    headers: { "Accept-Language": locale },
    signal,
  });
  // The internal route owns DTO validation. Guard pagination again before
  // mutating client state so an incorrect page can never repeat indefinitely.
  getNextReviewPage(result.pagination, page);
  return result;
}
