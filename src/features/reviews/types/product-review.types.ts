import type { PaginationMeta } from "@/lib/api/pagination";

export type ProductReviewRating = 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5;
export type ProductReviewSubmissionRating = 1 | 2 | 3 | 4 | 5;

export type ProductReviewSubmissionInput = Readonly<{
  rating: ProductReviewSubmissionRating;
  comment?: string;
}>;

export type ProductReviewSubmission = Readonly<{
  id: string;
  rating: ProductReviewSubmissionRating;
  comment: string | null;
  status: "pending";
  createdAt: string;
}>;

export type ProductReviewSummary = {
  average: number;
  count: number;
  breakdown: Record<"1" | "2" | "3" | "4" | "5", number>;
};

export type ProductReview = {
  id: string;
  reviewerDisplayName: string;
  rating: ProductReviewRating;
  comment: string | null;
  adminResponse: string | null;
  helpfulCount: number;
  photos: readonly string[];
  createdAt: string;
};

export type ProductReviewsPage = {
  summary: ProductReviewSummary;
  reviews: readonly ProductReview[];
  pagination: PaginationMeta;
};

export type ProductReviewReadResult =
  | { ok: true; page: ProductReviewsPage }
  | { ok: false };
