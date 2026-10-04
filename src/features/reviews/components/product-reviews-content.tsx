import type { Locale } from "next-intl";
import type { ReactNode } from "react";

import { formatProductMessage } from "@/features/products/utils/format-product-message";
import { ReviewCard } from "@/features/reviews/components/review-card";
import type { ProductReviewReadResult } from "@/features/reviews/types/product-review.types";

type ProductReviewsContentProps = {
  locale: Locale;
  children?: ReactNode;
  readResult: ProductReviewReadResult;
  copy: {
    titleTemplate: string;
    title: string;
    ratingLabelTemplate: string;
    empty: string;
    pageUnavailable: string;
    readError: string;
    adminResponse: string;
  };
};

export function ProductReviewsContent({
  locale,
  readResult,
  copy,
  children,
}: ProductReviewsContentProps) {
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  return (
    <section
      id="reviews"
      aria-labelledby="product-reviews-title"
      tabIndex={-1}
      className="min-w-0 scroll-mt-8"
    >
      <h2 id="product-reviews-title" className="text-h3 font-bold">
        {readResult.ok
          ? formatProductMessage(copy.titleTemplate, {
              count: numbers.format(readResult.page.summary.count),
            })
          : copy.title}
      </h2>
      {!readResult.ok ? (
        <p className="mt-5 rounded-lg bg-gray-50 p-5 type-body text-gray-600">
          {copy.readError}
        </p>
      ) : readResult.page.reviews.length === 0 ? (
        <p className="mt-5 rounded-lg bg-gray-50 p-5 type-body text-gray-600">
          {readResult.page.summary.count === 0 ? copy.empty : copy.pageUnavailable}
        </p>
      ) : (
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {readResult.page.reviews.map((review) => (
            <li key={review.id} className="min-w-0">
              <ReviewCard review={review} locale={locale} copy={copy} />
            </li>
          ))}
        </ul>
      )}
      {readResult.ok ? children : null}
    </section>
  );
}
