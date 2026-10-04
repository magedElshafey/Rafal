import type {
  ProductReviewRating,
  ProductReviewSubmissionRating,
} from "@/features/reviews/types/product-review.types";

export function isProductReviewRating(
  value: unknown,
): value is ProductReviewRating {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 1 &&
    value <= 5 &&
    Number.isInteger(value * 2)
  );
}

export function isProductReviewSubmissionRating(
  value: unknown,
): value is ProductReviewSubmissionRating {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}
