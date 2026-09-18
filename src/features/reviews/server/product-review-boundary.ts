import "server-only";

import type { Locale } from "next-intl";

import { serverEnv } from "@/config/server-env";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import type { AuthenticatedUser } from "@/features/auth/types/authenticated-user.types";
import { isKnownProductId } from "@/features/products/server/mock-product-catalog";
import {
  createMockPendingProductReview,
  getMockPublishedProductReviews,
  hasMockVerifiedReviewPurchase,
} from "@/features/reviews/server/mock-product-reviews";
import type {
  ProductReviewReadResult,
  ReviewEligibility,
  ReviewSubmissionInput,
  ReviewSubmissionResult,
} from "@/features/reviews/types/product-review.types";

function mockReviewSourceAvailable(): boolean {
  return serverEnv.useMockApi && process.env.NODE_ENV !== "production";
}

export async function getPublishedProductReviews(
  productId: string,
  locale: Locale,
): Promise<ProductReviewReadResult> {
  if (!mockReviewSourceAvailable() || !isKnownProductId(productId)) {
    return { ok: false };
  }

  try {
    return {
      ok: true,
      reviews: getMockPublishedProductReviews(productId, locale),
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const errorMessage =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);
      console.error(
        `[reviews:public-read] Unexpected read failure for product "${productId}": ${errorMessage}`,
      );
    }

    return { ok: false };
  }
}

export async function getProductReviewEligibility(
  productId: string,
): Promise<ReviewEligibility> {
  try {
    const user = await getCurrentUser();
    if (!user) return { status: "guest" };

    if (!mockReviewSourceAvailable() || !isKnownProductId(productId)) {
      return { status: "unavailable" };
    }

    return hasMockVerifiedReviewPurchase(user.id, productId)
      ? { status: "eligible" }
      : { status: "not-verified" };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const errorMessage =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);
      console.error(
        `[reviews:eligibility] Unexpected eligibility failure for product "${productId}": ${errorMessage}`,
      );
    }

    return { status: "unavailable" };
  }
}

export async function createPendingProductReview(
  user: AuthenticatedUser,
  input: ReviewSubmissionInput,
): Promise<ReviewSubmissionResult> {
  if (!mockReviewSourceAvailable()) {
    return { ok: false, error: { code: "service-unavailable" } };
  }

  if (!isKnownProductId(input.productId)) {
    return { ok: false, error: { code: "product-unavailable" } };
  }

  if (!hasMockVerifiedReviewPurchase(user.id, input.productId)) {
    return { ok: false, error: { code: "not-eligible" } };
  }

  createMockPendingProductReview(user, input);
  return { ok: true, moderationStatus: "pending" };
}
