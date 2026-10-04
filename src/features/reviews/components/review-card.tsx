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
    <article className="rounded-xl border border-gray-200  p-5 [overflow-wrap:anywhere] sm:p-6">
      <header className="flex flex-col md:flex-row items-center gap-2">
        <div className="size-8 bg-primary flex items-center justify-center rounded-[50%] text-white">
          <p>{review.reviewerDisplayName[0]}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <h3 className="min-w-0 type-body font-bold text-gray-900">
            <bdi>{review.reviewerDisplayName}</bdi>
          </h3>
          <Rating
            value={review.rating}
            label={formatProductMessage(copy.ratingLabelTemplate, {
              value: numbers.format(review.rating),
            })}
          />
          {review.comment ? (
            <p
              dir="auto"
              className="whitespace-pre-wrap type-body leading-relaxed text-gray-700"
            >
              {review.comment}
            </p>
          ) : null}
        </div>
      </header>

      {review.adminResponse !== null ? (
        <div className="mt-5 rounded-lg bg-gold-50 p-4">
          <h4 className="type-body-sm font-bold text-gray-900">
            {copy.adminResponse}
          </h4>
          <p
            dir="auto"
            className="mt-1 whitespace-pre-wrap type-body-sm leading-relaxed text-gray-700"
          >
            {review.adminResponse}
          </p>
        </div>
      ) : null}
    </article>
  );
}
