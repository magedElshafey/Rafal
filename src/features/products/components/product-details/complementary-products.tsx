import type { Locale } from "next-intl";

import {
  AppCarousel,
  AppCarouselContent,
  AppCarouselNext,
  AppCarouselPrevious,
  AppCarouselSlide,
  AppCarouselViewport,
} from "@/components/ui/app-carousel";
import { ListingProductCard } from "@/features/products/components/listing/product-grid";
import type { ListingProduct } from "@/features/products/types/product-listing.types";

type ComplementaryProductsProps = {
  badgeLabels: Record<"discount" | "new" | "personalization", string>;
  carouselLabel: string;
  locale: Locale;
  nextLabel: string;
  previousLabel: string;
  products: readonly ListingProduct[];
  ratingLabel: (value: number) => string;
  title: string;
  unavailableLabel: string;
};

export function ComplementaryProducts({
  badgeLabels,
  carouselLabel,
  locale,
  nextLabel,
  previousLabel,
  products,
  ratingLabel,
  title,
  unavailableLabel,
}: ComplementaryProductsProps) {
  if (products.length === 0) return null;

  return (
    <AppCarousel
      direction={locale === "ar" ? "rtl" : "ltr"}
      dragFree
      label={carouselLabel}
      slidesToScroll="auto"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-h3 font-bold">{title}</h2>
        <div className="flex gap-2">
          <AppCarouselPrevious
            label={previousLabel}
            size="sm"
            variant="outline"
          />
          <AppCarouselNext label={nextLabel} size="sm" variant="outline" />
        </div>
      </div>
      <AppCarouselViewport className="mt-5">
        <AppCarouselContent className="-ms-4">
          {products.map((product) => (
            <AppCarouselSlide
              key={product.id}
              className="basis-[62%] ps-4 sm:basis-[38%] lg:basis-1/5 xl:basis-1/6"
              label={product.name[locale]}
            >
              <ListingProductCard
                badgeLabels={badgeLabels}
                locale={locale}
                product={product}
                ratingLabel={ratingLabel}
                unavailableLabel={unavailableLabel}
              />
            </AppCarouselSlide>
          ))}
        </AppCarouselContent>
      </AppCarouselViewport>
    </AppCarousel>
  );
}
