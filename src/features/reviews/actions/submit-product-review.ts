"use server";

import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { createPendingProductReview } from "@/features/reviews/server/product-review-boundary";
import type {
  ProductReviewRating,
  ReviewSubmissionInput,
  ReviewSubmissionResult,
} from "@/features/reviews/types/product-review.types";

const MAX_PRODUCT_ID_LENGTH = 128;
const MAX_RAW_COMMENT_LENGTH = 10_000;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isProductReviewRating(value: unknown): value is ProductReviewRating {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

function parseInput(value: unknown): ReviewSubmissionInput | null {
  if (
    !isPlainRecord(value) ||
    !hasOnlyKeys(value, ["productId", "rating", "comment"])
  ) {
    return null;
  }

  const productId =
    typeof value.productId === "string" ? value.productId.trim() : "";
  if (
    productId.length === 0 ||
    productId.length > MAX_PRODUCT_ID_LENGTH ||
    !isProductReviewRating(value.rating) ||
    (value.comment !== null &&
      value.comment !== undefined &&
      (typeof value.comment !== "string" ||
        value.comment.length > MAX_RAW_COMMENT_LENGTH))
  ) {
    return null;
  }

  const normalizedComment =
    typeof value.comment === "string" ? value.comment.trim() : "";

  return {
    productId,
    rating: value.rating,
    comment: normalizedComment.length > 0 ? normalizedComment : null,
  };
}

export async function submitProductReview(
  input: unknown,
): Promise<ReviewSubmissionResult> {
  const parsedInput = parseInput(input);
  if (!parsedInput) {
    return { ok: false, error: { code: "invalid-input" } };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, error: { code: "auth-required" } };
    }

    return await createPendingProductReview(user, parsedInput);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const errorMessage =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);
      console.error(
        `[reviews:submit] Unexpected mutation failure for product "${parsedInput.productId}": ${errorMessage}`,
      );
    }

    return { ok: false, error: { code: "service-unavailable" } };
  }
}
