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
