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

  let loadMore = null;
  if (
    readResult.ok &&
    readResult.page.pagination.current_page < readResult.page.pagination.last_page
  ) {
    const { ProductReviewsLoadMore } = await import(
      "@/features/reviews/components/product-reviews-load-more"
    );
    loadMore = (
      <ProductReviewsLoadMore
        key={`${productId}:${locale}`}
        productId={productId}
        locale={locale}
        initialNextPage={readResult.page.pagination.current_page + 1}
        lastPage={readResult.page.pagination.last_page}
        initialReviewIds={readResult.page.reviews.map((review) => review.id)}
        copy={{
          ratingLabelTemplate: t.raw("rating.label") as string,
          adminResponse: t("reviews.adminResponse"),
          showMore: t("reviews.showMore"),
          loading: t("reviews.loading"),
          error: t("reviews.loadMoreError"),
          loadedTemplate: t.raw("reviews.moreLoaded") as string,
        }}
      />
    );
  }

  return (
    <ProductReviewsContent
      locale={locale}
      readResult={readResult}
      copy={{
        titleTemplate: t.raw("reviews.title") as string,
        title: t("reviews.heading"),
        ratingLabelTemplate: t.raw("rating.label") as string,
        empty: t("reviews.empty"),
        pageUnavailable: t("reviews.pageUnavailable"),
        readError: t("reviews.readError.title"),
        adminResponse: t("reviews.adminResponse"),
      }}
    >
      {loadMore}
    </ProductReviewsContent>
  );
}
