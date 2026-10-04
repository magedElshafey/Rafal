import "server-only";

import type { Locale } from "next-intl";

import {
  parseProductReviewSubmissionResponse,
  parseProductReviewsResponse,
  ProductReviewsContractError,
} from "@/features/reviews/api/parse-product-reviews-dto";
import { mapProductReviewsResponse } from "@/features/reviews/api/product-reviews-mapper";
import type {
  ProductReviewSubmission,
  ProductReviewSubmissionInput,
} from "@/features/reviews/types/product-review.types";
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

export async function submitProductReview({
  productId,
  locale,
  accessToken,
  input,
  signal,
}: {
  productId: string;
  locale: Locale;
  accessToken: string;
  input: ProductReviewSubmissionInput;
  signal?: AbortSignal;
}): Promise<ProductReviewSubmission> {
  const body = new FormData();
  body.append("rating", String(input.rating));
  if (input.comment) body.append("comment", input.comment);

  const payload = await serverApi.request<unknown, FormData>({
    path: `/products/${encodeURIComponent(productId)}/reviews`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": locale,
    },
    body,
    signal,
    retry: false,
  });
  const parsed = parseProductReviewSubmissionResponse(payload);
  return {
    id: String(parsed.data.id),
    rating: parsed.data.rating,
    comment: parsed.data.comment,
    status: parsed.data.status,
    createdAt: parsed.data.created_at,
  };
}
