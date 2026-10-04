"use client";

import type { Locale } from "next-intl";
import { Children, useEffect, useRef, useState, type ReactNode } from "react";

import {
  AppCarousel,
  AppCarouselContent,
  AppCarouselNext,
  AppCarouselPosition,
  AppCarouselPrevious,
  AppCarouselSlide,
  AppCarouselViewport,
} from "@/components/ui/app-carousel";
import { Button } from "@/components/ui/button";
import { formatProductMessage } from "@/features/products/utils/format-product-message";
import { getProductReviewsClient } from "@/features/reviews/api/get-product-reviews.client";
import {
  ReviewCard,
  type ReviewCardCopy,
} from "@/features/reviews/components/review-card";
import type { ProductReview } from "@/features/reviews/types/product-review.types";
import { getNextReviewPage } from "@/features/reviews/utils/review-pagination";

type ProductReviewsCarouselCopy = ReviewCardCopy & {
  carouselLabel: string;
  previous: string;
  next: string;
  position: string;
  showMore: string;
  loading: string;
  error: string;
  loadedTemplate: string;
  slideLabelTemplate: string;
};

type ProductReviewsCarouselProps = {
  children: ReactNode;
  productId: string;
  locale: Locale;
  initialNextPage: number | null;
  lastPage: number;
  initialReviewIds: readonly string[];
  initialSlideLabels: readonly string[];
  totalReviews: number;
  copy: ProductReviewsCarouselCopy;
};

const slideClassName =
  "basis-[88%] ps-4 sm:basis-[58%] lg:basis-1/2 xl:basis-1/3";

export function ProductReviewsCarousel({
  children,
  productId,
  locale,
  initialNextPage,
  lastPage,
  initialReviewIds,
  initialSlideLabels,
  totalReviews,
  copy,
}: ProductReviewsCarouselProps) {
  const numbers = new Intl.NumberFormat(locale);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(
    initialNextPage !== null && initialNextPage <= lastPage
      ? initialNextPage
      : null,
  );
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const seenIds = useRef(new Set(initialReviewIds));
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => () => inFlight.current?.abort(), []);

  async function loadMore() {
    if (inFlight.current || nextPage === null) return;

    const controller = new AbortController();
    inFlight.current = controller;
    setPending(true);
    setFailed(false);
    setAnnouncement("");

    try {
      const page = await getProductReviewsClient({
        productId,
        locale,
        page: nextPage,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      const followingPage = getNextReviewPage(page.pagination, nextPage);
      const added: ProductReview[] = [];
      for (const review of page.reviews) {
        if (seenIds.current.has(review.id)) continue;
        seenIds.current.add(review.id);
        added.push(review);
      }

      setReviews((previous) => [...previous, ...added]);
      setNextPage(followingPage);
      setAnnouncement(
        formatProductMessage(copy.loadedTemplate, {
          count: new Intl.NumberFormat(locale).format(added.length),
        }),
      );
    } catch {
      if (!controller.signal.aborted) setFailed(true);
    } finally {
      if (!controller.signal.aborted) setPending(false);
      inFlight.current = null;
    }
  }

  return (
    <div className="mt-6">
      <AppCarousel
        label={copy.carouselLabel}
        direction={locale === "ar" ? "rtl" : "ltr"}
        slidesToScroll={1}
        deferUntilNearViewport
        className="-mx-4 px-4 sm:mx-0 sm:px-0"
      >
        <AppCarouselViewport>
          <AppCarouselContent className="-ms-4 items-stretch">
            {Children.map(children, (child, index) => (
              <AppCarouselSlide
                className={slideClassName}
                label={initialSlideLabels[index]}
              >
                {child}
              </AppCarouselSlide>
            ))}
            {reviews.map((review, index) => (
              <AppCarouselSlide
                key={review.id}
                className={slideClassName}
                label={formatProductMessage(copy.slideLabelTemplate, {
                  current: numbers.format(initialReviewIds.length + index + 1),
                  total: numbers.format(totalReviews),
                  reviewer: review.reviewerDisplayName,
                })}
              >
                <ReviewCard review={review} locale={locale} copy={copy} />
              </AppCarouselSlide>
            ))}
          </AppCarouselContent>
        </AppCarouselViewport>

        <div className="mt-4 flex items-center justify-center gap-2 sm:justify-end">
          <AppCarouselPrevious label={copy.previous} variant="outline" />
          <AppCarouselPosition
            label={copy.position}
            locale={locale}
            className="min-w-16 sm:hidden"
          />
          <AppCarouselNext label={copy.next} variant="outline" />
        </div>
      </AppCarousel>

      {nextPage !== null ? (
        <div className="mt-5 flex flex-col items-center gap-3">
          <Button
            variant="outline"
            className="h-auto min-h-11 max-w-full whitespace-normal py-3"
            onClick={loadMore}
            loading={pending}
            loadingLabel={copy.loading}
            disabled={pending}
            aria-describedby={failed ? "product-reviews-load-error" : undefined}
          >
            {copy.showMore}
          </Button>
          {failed ? (
            <p
              id="product-reviews-load-error"
              role="alert"
              className="type-body text-gray-600"
            >
              {copy.error}
            </p>
          ) : null}
        </div>
      ) : null}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
