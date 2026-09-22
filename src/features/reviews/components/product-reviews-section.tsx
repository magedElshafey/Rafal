import type { Locale } from "next-intl";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Rating } from "@/features/products/components/product-card/rating";
import type { ProductRatingSummary } from "@/features/products/types/product-details.types";
import { formatProductMessage } from "@/features/products/utils/format-product-message";
import {
  ProductReviewEligibility,
  ProductReviewEligibilityLoading,
} from "@/features/reviews/components/product-review-eligibility";
import type { ProductReviewSubmissionCopy } from "@/features/reviews/components/product-review-submission";
import type { ProductReviewReadResult } from "@/features/reviews/types/product-review.types";
import { Link } from "@/i18n/navigation";

export type ProductReviewsSectionCopy = {
  titleTemplate: string;
  aggregateTemplate: string;
  ratingLabelTemplate: string;
  empty: string;
  readErrorTitle: string;
  readErrorDescription: string;
  retry: string;
  submission: ProductReviewSubmissionCopy;
};

type ProductReviewsSectionProps = {
  copy: ProductReviewsSectionCopy;
  locale: Locale;
  loginReturnTo: string;
  productId: string;
  ratingSummary: ProductRatingSummary | null;
  readResult: ProductReviewReadResult;
  retryHref: string;
};

export function ProductReviewsSection({
  copy,
  locale,
  loginReturnTo,
  productId,
  ratingSummary,
  readResult,
  retryHref,
}: ProductReviewsSectionProps) {
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  });
  const numberFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  });
  const formattedAverage = ratingSummary
    ? numberFormatter.format(ratingSummary.average)
    : null;
  const reviewCount =
    ratingSummary?.count ?? (readResult.ok ? readResult.reviews.length : 0);
  const formattedCount = numberFormatter.format(reviewCount);
  const ratingLabel = formattedAverage
    ? formatProductMessage(copy.ratingLabelTemplate, {
        value: formattedAverage,
      })
    : null;

  return (
    <section aria-labelledby="product-reviews-title">
      <h2 id="product-reviews-title" className="text-h3 font-bold">
        {formatProductMessage(copy.titleTemplate, {
          count: formattedCount,
        })}
      </h2>

      {ratingSummary && formattedAverage && ratingLabel ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-5">
          <span className="text-h2 font-bold text-gray-1000">
            {formattedAverage}
          </span>
          <div>
            <Rating value={ratingSummary.average} label={ratingLabel} />
            <p className="mt-1 type-body-sm text-gray-500">
              {formatProductMessage(copy.aggregateTemplate, {
                average: formattedAverage,
                count: formattedCount,
              })}
            </p>
          </div>
        </div>
      ) : null}

      {readResult.ok ? (
        readResult.reviews.length > 0 ? (
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {readResult.reviews.map((review) => (
              <li key={review.id}>
                <article className="h-full rounded-lg bg-gray-50 p-5">
                  <header className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-50 type-body font-bold text-gold-700"
                    >
                      {review.reviewerDisplayName.trim().charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="type-body font-bold text-gray-900">
                          {review.reviewerDisplayName}
                        </h3>
                        <time
                          dateTime={review.submittedAt}
                          className="type-caption text-gray-400"
                        >
                          {dateFormatter.format(new Date(review.submittedAt))}
                        </time>
                      </div>
                      <Rating
                        className="mt-1"
                        value={review.rating}
                        label={formatProductMessage(copy.ratingLabelTemplate, {
                          value: numberFormatter.format(review.rating),
                        })}
                      />
                    </div>
                  </header>
                  {review.comment ? (
                    <p className="mt-3 break-words type-body text-gray-600">
                      {review.comment}
                    </p>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-lg bg-gray-50 p-5 type-body text-gray-600">
            {copy.empty}
          </p>
        )
      ) : (
        <ErrorState
          className="mt-5"
          title={copy.readErrorTitle}
          description={copy.readErrorDescription}
          action={
            <Link
              href={retryHref}
              className={buttonVariants({ variant: "outline" })}
            >
              {copy.retry}
            </Link>
          }
        />
      )}

      <div className="mt-6">
        <Suspense
          fallback={<ProductReviewEligibilityLoading copy={copy.submission} />}
        >
          <ProductReviewEligibility
            copy={copy.submission}
            loginReturnTo={loginReturnTo}
            productId={productId}
          />
        </Suspense>
      </div>
    </section>
  );
}
