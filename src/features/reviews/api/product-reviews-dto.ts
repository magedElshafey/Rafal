import type { ProductReviewRating } from "@/features/reviews/types/product-review.types";

export type ProductReviewDto = {
  id: number;
  rating: ProductReviewRating;
  comment: string | null;
  reviewer_display_name: string;
  admin_response: string | null;
  helpful_count: number;
  photos: readonly string[];
  created_at: string;
};

export type ProductReviewsResponseDto = {
  success: true;
  message: string;
  data: {
    summary: {
      average: number;
      count: number;
      breakdown: Record<"1" | "2" | "3" | "4" | "5", number>;
    };
    reviews: readonly ProductReviewDto[];
  };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};
