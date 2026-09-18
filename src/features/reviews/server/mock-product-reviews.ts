import "server-only";

import type { Locale } from "next-intl";

import type { AuthenticatedUser } from "@/features/auth/types/authenticated-user.types";
import type {
  ProductReview,
  ProductReviewRating,
  ReviewSubmissionInput,
} from "@/features/reviews/types/product-review.types";

type MockModerationStatus = "hidden" | "pending" | "published";

type MockProductReviewRecord = {
  id: string;
  productId: string;
  reviewerDisplayNames: Record<Locale, string>;
  rating: ProductReviewRating;
  comment: string | null;
  submittedAt: string;
  moderationStatus: MockModerationStatus;
};

// Stable development fixtures intentionally cover every storefront-visible
// moderation state. Only published records are projected by the public read.
const mockProductReviewRecords: readonly MockProductReviewRecord[] = [
  {
    id: "mock-review-gold-chain-published-01",
    productId: "personalized-gold-chain",
    reviewerDisplayNames: { ar: "سارة أ.", en: "Sara A." },
    rating: 5,
    comment: "هدية رائعة لأختي، أحببت التصميم كثيرًا.",
    submittedAt: "2026-08-22T11:30:00+03:00",
    moderationStatus: "published",
  },
  {
    id: "mock-review-gold-chain-published-02",
    productId: "personalized-gold-chain",
    reviewerDisplayNames: { ar: "نورة م.", en: "Noura M." },
    rating: 4,
    comment: "The engraving was clear and the gift packaging was beautiful.",
    submittedAt: "2026-08-15T15:10:00+03:00",
    moderationStatus: "published",
  },
  {
    id: "mock-review-gold-chain-pending-01",
    productId: "personalized-gold-chain",
    reviewerDisplayNames: { ar: "ريم س.", en: "Reem S." },
    rating: 5,
    comment: "بانتظار مراجعة فريق المتجر.",
    submittedAt: "2026-08-28T09:00:00+03:00",
    moderationStatus: "pending",
  },
  {
    id: "mock-review-gold-chain-hidden-01",
    productId: "personalized-gold-chain",
    reviewerDisplayNames: { ar: "مستخدم مخفي", en: "Hidden user" },
    rating: 1,
    comment: "This hidden fixture must never reach the storefront.",
    submittedAt: "2026-08-10T13:45:00+03:00",
    moderationStatus: "hidden",
  },
];

// Existing Orders do not carry canonical product identity, so this small
// synthetic fixture is the development-only verified-purchase authority.
const mockVerifiedReviewEligibility = new Set([
  "mock-customer-01:personalized-gold-chain",
  "mock-customer-01:women-jewelry-2",
]);

const MAX_PENDING_REVIEW_RECORDS = 100;
const submittedPendingReviewRecords: MockProductReviewRecord[] = [];
let nextPendingReviewSequence = 1;

export function getMockPublishedProductReviews(
  productId: string,
  locale: Locale,
): readonly ProductReview[] {
  return mockProductReviewRecords
    .filter(
      (review) =>
        review.productId === productId &&
        review.moderationStatus === "published",
    )
    .toSorted(
      (first, second) =>
        Date.parse(second.submittedAt) - Date.parse(first.submittedAt),
    )
    .slice(0, 6)
    .map((review) => ({
      id: review.id,
      reviewerDisplayName: review.reviewerDisplayNames[locale],
      rating: review.rating,
      comment: review.comment,
      submittedAt: review.submittedAt,
    }));
}

export function hasMockVerifiedReviewPurchase(
  userId: string,
  productId: string,
): boolean {
  return mockVerifiedReviewEligibility.has(`${userId}:${productId}`);
}

export function createMockPendingProductReview(
  user: AuthenticatedUser,
  input: ReviewSubmissionInput,
): void {
  if (submittedPendingReviewRecords.length >= MAX_PENDING_REVIEW_RECORDS) {
    submittedPendingReviewRecords.shift();
  }

  submittedPendingReviewRecords.push({
    id: `mock-submitted-review-${nextPendingReviewSequence++}`,
    productId: input.productId,
    reviewerDisplayNames: {
      ar: `${user.firstName} ${user.lastName}`,
      en: `${user.firstName} ${user.lastName}`,
    },
    rating: input.rating,
    comment: input.comment,
    submittedAt: new Date().toISOString(),
    moderationStatus: "pending",
  });
}
