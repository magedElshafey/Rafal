import type { Locale } from "next-intl";

import { Rating } from "@/features/products/components/product-card/rating";
import { formatProductMessage } from "@/features/products/utils/format-product-message";
import type { ProductReview } from "@/features/reviews/types/product-review.types";

export type ReviewCardCopy = {
  ratingLabelTemplate: string;
  adminResponse: string;
};

export function ReviewCard({
  review,
  locale,
  copy,
}: {
  review: ProductReview;
  locale: Locale;
  copy: ReviewCardCopy;
}) {
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  return (
    <article className="h-full rounded-lg bg-gray-50 p-5 [overflow-wrap:anywhere]">
      <header>
        <h3 className="min-w-0 type-body font-bold text-gray-900">
          <bdi>{review.reviewerDisplayName}</bdi>
        </h3>
        <Rating
          className="mt-1"
          value={review.rating}
          label={formatProductMessage(copy.ratingLabelTemplate, {
            value: numbers.format(review.rating),
          })}
        />
      </header>
      {review.comment ? (
        <p dir="auto" className="mt-3 whitespace-pre-wrap type-body text-gray-600">
          {review.comment}
        </p>
      ) : null}
      {review.adminResponse !== null ? (
        <div className="mt-4 border-s border-gray-200 ps-4">
          <h4 className="type-body-sm font-bold text-gray-900">
            {copy.adminResponse}
          </h4>
          <p dir="auto" className="mt-1 whitespace-pre-wrap type-body text-gray-600">
            {review.adminResponse}
          </p>
        </div>
      ) : null}
    </article>
  );
}
