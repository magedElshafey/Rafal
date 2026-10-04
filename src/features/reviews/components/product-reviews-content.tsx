import type { Locale } from "next-intl";

import { formatProductMessage } from "@/features/products/utils/format-product-message";
import { ProductReviewsCarousel } from "@/features/reviews/components/product-reviews-carousel";
import { ReviewCard } from "@/features/reviews/components/review-card";
import type { ProductReviewReadResult } from "@/features/reviews/types/product-review.types";

type ProductReviewsContentProps = {
  productId: string;
  locale: Locale;
  readResult: ProductReviewReadResult;
  copy: {
    titleTemplate: string;
    title: string;
    ratingLabelTemplate: string;
    aggregateTemplate: string;
    empty: string;
    pageUnavailable: string;
    readError: string;
    adminResponse: string;
    carouselLabel: string;
    previous: string;
    next: string;
    position: string;
    slideLabelTemplate: string;
    showMore: string;
    loading: string;
    loadMoreError: string;
    moreLoadedTemplate: string;
  };
};

export function ProductReviewsContent({
  productId,
  locale,
  readResult,
  copy,
}: ProductReviewsContentProps) {
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  return (
    <section id="reviews" aria-labelledby="product-reviews-title" tabIndex={-1}>
      <h2 id="product-reviews-title" className="text-h3 font-bold">
        {readResult.ok
          ? formatProductMessage(copy.titleTemplate, {
              count: numbers.format(readResult.page.summary.count),
            })
          : copy.title}
      </h2>

      {!readResult.ok ? (
        <p className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5 type-body text-gray-600">
          {copy.readError}
        </p>
      ) : readResult.page.reviews.length === 0 ? (
        <p className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5 type-body text-gray-600">
          {readResult.page.summary.count === 0
            ? copy.empty
            : copy.pageUnavailable}
        </p>
      ) : readResult.page.summary.count === 1 ? (
        <div className="mt-6 max-w-2xl">
          <ReviewCard
            review={readResult.page.reviews[0]}
            locale={locale}
            copy={copy}
          />
        </div>
      ) : (
        <ProductReviewsCarousel
          productId={productId}
          locale={locale}
          initialNextPage={
            readResult.page.pagination.current_page <
            readResult.page.pagination.last_page
              ? readResult.page.pagination.current_page + 1
              : null
          }
          lastPage={readResult.page.pagination.last_page}
          totalReviews={readResult.page.summary.count}
          initialReviewIds={readResult.page.reviews.map((review) => review.id)}
          initialSlideLabels={readResult.page.reviews.map((review, index) =>
            formatProductMessage(copy.slideLabelTemplate, {
              current: numbers.format(index + 1),
              total: numbers.format(readResult.page.summary.count),
              reviewer: review.reviewerDisplayName,
            }),
          )}
          copy={{
            ratingLabelTemplate: copy.ratingLabelTemplate,
            adminResponse: copy.adminResponse,
            carouselLabel: copy.carouselLabel,
            previous: copy.previous,
            next: copy.next,
            position: copy.position,
            showMore: copy.showMore,
            loading: copy.loading,
            error: copy.loadMoreError,
            loadedTemplate: copy.moreLoadedTemplate,
            slideLabelTemplate: copy.slideLabelTemplate,
          }}
        >
          {readResult.page.reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              locale={locale}
              copy={copy}
            />
          ))}
        </ProductReviewsCarousel>
      )}
    </section>
  );
}
