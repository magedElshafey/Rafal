import type { Locale } from "next-intl";

import type { ProductReviewSubmissionInput } from "@/features/reviews/types/product-review.types";
import { createHttpClient } from "@/lib/api/http-client";

type SubmissionResponse = { status: "pending" };

export async function submitProductReviewFromBrowser({
  productId,
  locale,
  input,
}: {
  productId: string;
  locale: Locale;
  input: ProductReviewSubmissionInput;
}): Promise<void> {
  const api = createHttpClient({
    baseUrl: new URL("/api/", window.location.origin),
    maxRetries: 0,
  });
  const result = await api.request<SubmissionResponse>({
    path: `/products/${encodeURIComponent(productId)}/reviews`,
    method: "POST",
    headers: { "Accept-Language": locale },
    body: input,
    retry: false,
  });
  if (result.status !== "pending") {
    throw new Error("Invalid Product Review submission response.");
  }
}
