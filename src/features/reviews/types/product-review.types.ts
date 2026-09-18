export type ProductReviewRating = 1 | 2 | 3 | 4 | 5;

export type ProductReview = {
  id: string;
  reviewerDisplayName: string;
  rating: ProductReviewRating;
  comment: string | null;
  submittedAt: string;
};

export type ProductReviewReadResult =
  | { ok: true; reviews: readonly ProductReview[] }
  | { ok: false };

export type ReviewEligibility =
  | { status: "guest" }
  | { status: "eligible" }
  | { status: "not-verified" }
  | { status: "unavailable" };

export type ReviewSubmissionInput = {
  productId: string;
  rating: ProductReviewRating;
  comment: string | null;
};

export type ReviewSubmissionErrorCode =
  | "auth-required"
  | "invalid-input"
  | "not-eligible"
  | "product-unavailable"
  | "service-unavailable";

export type ReviewSubmissionResult =
  | { ok: true; moderationStatus: "pending" }
  | { ok: false; error: { code: ReviewSubmissionErrorCode } };
