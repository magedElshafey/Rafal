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
const pdpSlideClassName = "basis-[76%] ps-4 min-[480px]:basis-[46%] sm:basis-1/3 lg:basis-1/4 xl:basis-1/5";

export type RecommendationRowCopy = {
  previous: string;
  next: string;
  badges: Record<"discount" | "new" | "personalization", string>;
  rating: (value: string) => string;
  reviews: (count: number) => string;
  unavailable: string;
};

export function RecommendationRowView({ products, locale, accountId, title, copy, renderQuickAdd, presentation }: {
  presentation?: "pdp";
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
      {presentation !== "pdp" && <h2 className="text-h3 font-bold">{title}</h2>}
      <AppCarousel className={presentation === "pdp" ? undefined : "mt-5"} direction={locale === "ar" ? "rtl" : "ltr"}
        label={title} dragFree slidesToScroll="auto" deferUntilNearViewport>
        <div className={presentation === "pdp" ? "mb-5 flex items-center justify-between gap-4" : "mb-3 hidden justify-end gap-3 p-1 md:flex"}>
          {presentation === "pdp" && <h2 className="text-h3 font-bold">{title}</h2>}
          <div className={presentation === "pdp" ? "flex shrink-0 gap-2 p-1" : "contents"}>
          <AppCarouselPrevious label={copy.previous} size="sm" variant="outline" />
          <AppCarouselNext label={copy.next} size="sm" variant="outline" />
          </div>
        </div>
        <AppCarouselViewport>
          <AppCarouselContent className="-ms-4">
            {products.slice(0, 10).map((product, index) => (
              <AppCarouselSlide key={`${product.id}:${index}`} className={presentation === "pdp" ? pdpSlideClassName : slideClassName} label={product.name}>
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

export function RecommendationRowSkeleton({ title, loadingLabel, presentation }: { title: string; loadingLabel: string; presentation?: "pdp" }) {
  return (
    <section aria-label={title} aria-busy="true" className={sectionClassName}>
      <h2 className="text-h3 font-bold">{title}</h2>
      <span role="status" className="sr-only">{loadingLabel}</span>
      <div aria-hidden="true" className="mt-5 overflow-hidden">
        {presentation !== "pdp" && <div className="mb-3 hidden h-10 md:block" />}
        <div className="-ms-4 flex">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className={`min-w-0 shrink-0 ${presentation === "pdp" ? pdpSlideClassName : slideClassName}`}><ProductCardSkeleton /></div>
          ))}
        </div>
      </div>
    </section>
  );
}
