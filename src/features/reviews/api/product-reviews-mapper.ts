import type { ProductReviewsResponseDto } from "@/features/reviews/api/product-reviews-dto";
import type { ProductReviewsPage } from "@/features/reviews/types/product-review.types";

export function mapProductReviewsResponse(
  response: ProductReviewsResponseDto,
): ProductReviewsPage {
  return {
    summary: response.data.summary,
    reviews: response.data.reviews.map((review) => ({
      id: String(review.id),
      rating: review.rating,
      comment: review.comment,
      reviewerDisplayName: review.reviewer_display_name,
      adminResponse: review.admin_response,
      helpfulCount: review.helpful_count,
      photos: review.photos,
      createdAt: review.created_at,
    })),
    // Shared PaginationMeta intentionally uses Laravel's pagination names.
    pagination: { ...response.meta },
  };
}
