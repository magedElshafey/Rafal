import type { ReactNode } from "react";
import type { Locale } from "next-intl";

import {
  AppCarousel,
  AppCarouselContent,
  AppCarouselSlide,
  AppCarouselViewport,
} from "@/components/ui/app-carousel";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import {
  HomeProductCard,
  type HomeProductCardLabels,
} from "@/features/home/components/home-product-card";
import type { HomeProduct } from "@/features/home/types/home-product.types";
import { Link } from "@/i18n/navigation";

type ProductShelfProps = {
  carouselLabel: string;
  headerContent?: ReactNode;
  labels: HomeProductCardLabels;
  locale: Locale;
  products: readonly HomeProduct[];
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
};

export function ProductShelf({
  carouselLabel,
  headerContent,
  labels,
  locale,
  products,
  title,
  viewAllHref,
  viewAllLabel,
}: ProductShelfProps) {
  if (products.length === 0) return null;

  const direction = new Intl.Locale(locale).language === "ar" ? "rtl" : "ltr";

  return (
    <Section spacing="none" aria-label={title}>
      <Container>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-h3 font-medium text-foreground">{title}</h2>
          <Link
            href={viewAllHref}
            className="shrink-0 type-body font-medium text-gold-500 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {viewAllLabel}
          </Link>
        </div>

        {headerContent ? <div className="mt-4">{headerContent}</div> : null}

        <AppCarousel
          className="mt-5"
          direction={direction}
          dragFree
          label={carouselLabel}
          slidesToScroll="auto"
        >
          <AppCarouselViewport>
            <AppCarouselContent className="-ms-4">
              {products.map((product) => (
                <AppCarouselSlide
                  key={product.id}
                  className="basis-[58%] ps-4 min-[480px]:basis-[42%] sm:basis-[34%] md:basis-1/4 lg:basis-1/6"
                  label={product.name[locale]}
                >
                  <HomeProductCard
                    labels={labels}
                    locale={locale}
                    product={product}
                  />
                </AppCarouselSlide>
              ))}
            </AppCarouselContent>
          </AppCarouselViewport>
        </AppCarousel>
      </Container>
    </Section>
  );
}
