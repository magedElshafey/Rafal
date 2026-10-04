import "server-only";

import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { ProductReviewsContent } from "@/features/reviews/components/product-reviews-content";
import { readProductReviews } from "@/features/reviews/server/product-reviews-boundary";

export async function ProductReviewsSection({
  productId,
  locale,
}: {
  productId: string;
  locale: Locale;
}) {
  const [readResult, t] = await Promise.all([
    readProductReviews(productId, locale),
    getTranslations({ locale, namespace: "Common.productDetails" }),
  ]);

  return (
    <ProductReviewsContent
      productId={productId}
      locale={locale}
      readResult={readResult}
      copy={{
        titleTemplate: t.raw("reviews.title") as string,
        title: t("reviews.heading"),
        ratingLabelTemplate: t.raw("rating.label") as string,
        aggregateTemplate: t.raw("reviews.aggregate") as string,
        empty: t("reviews.empty"),
        pageUnavailable: t("reviews.pageUnavailable"),
        readError: t("reviews.readError.title"),
        adminResponse: t("reviews.adminResponse"),
        carouselLabel: t("reviews.carouselLabel"),
        previous: t("reviews.previous"),
        next: t("reviews.next"),
        position: t("reviews.position"),
        slideLabelTemplate: t.raw("reviews.slideLabel") as string,
        showMore: t("reviews.showMore"),
        loading: t("reviews.loading"),
        loadMoreError: t("reviews.loadMoreError"),
        moreLoadedTemplate: t.raw("reviews.moreLoaded") as string,
      }}
    />
  );
}
