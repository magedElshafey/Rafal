import "server-only";

import type { Locale } from "next-intl";

import { getAccessToken } from "@/features/auth/server/auth-session";
import { submitProductReview } from "@/features/reviews/api/product-reviews-api.server";
import type {
  ProductReviewSubmission,
  ProductReviewSubmissionInput,
} from "@/features/reviews/types/product-review.types";

export class ProductReviewAuthenticationError extends Error {
  constructor() {
    super("An authenticated session is required to submit a Product Review.");
    this.name = "ProductReviewAuthenticationError";
  }
}

export async function submitCurrentUserProductReview(
  productId: string,
  locale: Locale,
  input: ProductReviewSubmissionInput,
  signal?: AbortSignal,
): Promise<ProductReviewSubmission> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new ProductReviewAuthenticationError();

  return submitProductReview({
    productId,
    locale,
    accessToken,
    input,
    signal,
  });
}
