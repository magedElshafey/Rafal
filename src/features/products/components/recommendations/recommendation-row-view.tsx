import type { Locale } from "next-intl";
import type { ReactNode } from "react";
import {
  AppCarousel, AppCarouselContent, AppCarouselNext, AppCarouselPrevious,
  AppCarouselSlide, AppCarouselViewport,
} from "@/components/ui/app-carousel";
import { ListingProductCard, ProductCardSkeleton } from "@/features/products/components/listing/product-grid";
import type { ListingProduct } from "@/features/products/types/product-listing.types";


const slideClassName = "basis-[58%] ps-4 min-[480px]:basis-[42%] sm:basis-[34%] md:basis-1/4 lg:basis-1/6";
const sectionClassName = "mt-10 border-t border-gray-200 pt-8 lg:mt-12 lg:pt-10";

export type RecommendationRowCopy = {
  previous: string;
  next: string;
  badges: Record<"discount" | "new" | "personalization", string>;
  rating: (value: string) => string;
  reviews: (count: number) => string;
  unavailable: string;
};

export function RecommendationRowView({ products, locale, accountId, title, copy, renderQuickAdd }: {
  products: readonly ListingProduct[];
  locale: Locale;
  accountId: string | null;
  title: string;
  copy: RecommendationRowCopy;
  renderQuickAdd?: (product: ListingProduct) => ReactNode;
}) {
  if (products.length === 0) return null;
  return (
    <section aria-label={title} className={sectionClassName}>
      <h2 className="text-h3 font-bold">{title}</h2>
      <AppCarousel className="mt-5" direction={locale === "ar" ? "rtl" : "ltr"}
        label={title} dragFree slidesToScroll="auto" deferUntilNearViewport>
        <div className="mb-3 hidden justify-end gap-3 p-1 md:flex">
          <AppCarouselPrevious label={copy.previous} size="sm" variant="outline" />
          <AppCarouselNext label={copy.next} size="sm" variant="outline" />
        </div>
        <AppCarouselViewport>
          <AppCarouselContent className="-ms-4">
            {products.slice(0, 10).map((product, index) => (
              <AppCarouselSlide key={`${product.id}:${index}`} className={slideClassName} label={product.name}>
                <ListingProductCard product={product} locale={locale} wishlistAccountId={accountId}
                  quickAddControl={renderQuickAdd?.(product)}
                  badgeLabels={copy.badges}
                  ratingLabel={copy.rating}
                  reviewsLabel={copy.reviews}
                  unavailableLabel={copy.unavailable} />
              </AppCarouselSlide>
            ))}
          </AppCarouselContent>
        </AppCarouselViewport>
      </AppCarousel>
    </section>
  );
}

export function RecommendationRowSkeleton({ title, loadingLabel }: { title: string; loadingLabel: string }) {
  return (
    <section aria-label={title} aria-busy="true" className={sectionClassName}>
      <h2 className="text-h3 font-bold">{title}</h2>
      <span role="status" className="sr-only">{loadingLabel}</span>
      <div aria-hidden="true" className="mt-5 overflow-hidden">
        <div className="mb-3 hidden h-10 md:block" />
        <div className="-ms-4 flex">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className={`min-w-0 shrink-0 ${slideClassName}`}><ProductCardSkeleton /></div>
          ))}
        </div>
      </div>
    </section>
  );
}
