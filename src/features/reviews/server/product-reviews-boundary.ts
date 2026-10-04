import "server-only";

import type { Locale } from "next-intl";

import { getProductReviews } from "@/features/reviews/api/product-reviews-api.server";
import { ProductReviewsContractError } from "@/features/reviews/api/parse-product-reviews-dto";
import type { ProductReviewReadResult } from "@/features/reviews/types/product-review.types";
import { ApiError } from "@/lib/api/api-error";

export async function readProductReviews(
  productId: string,
  locale: Locale,
  options: { page?: number; signal?: AbortSignal; retry?: false } = {},
): Promise<ProductReviewReadResult> {
  try {
    return {
      ok: true,
      page: await getProductReviews({ productId, locale, ...options }),
    };
  } catch (error) {
    // Preserve engineering visibility without logging review text or raw
    // backend errors. Contract messages contain only field paths/expectations.
    console.error("[product-reviews:read] failed", {
      productId,
      kind: error instanceof ProductReviewsContractError ? "contract" : "request",
      ...(error instanceof ProductReviewsContractError
        ? { reason: error.message }
        : {}),
      ...(error instanceof ApiError ? { status: error.status } : {}),
    });
    return { ok: false };
  }
}
