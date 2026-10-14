import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import {
  AppCarousel,
  AppCarouselContent,
  AppCarouselDots,
  AppCarouselSlide,
  AppCarouselViewport,
} from "@/components/ui/app-carousel";
import type { Banner } from "@/features/home/types";

type HomeBannerCarouselProps = {
  banners: readonly Banner[];
  deferUntilNearViewport?: boolean;
  renderBanner: (banner: Banner, index: number, alt: string) => ReactNode;
};

export async function HomeBannerCarousel({
  banners,
  deferUntilNearViewport = false,
  renderBanner,
}: HomeBannerCarouselProps) {
  if (banners.length === 0) return null;

  const [t, locale] = await Promise.all([
    getTranslations("Home.hero"),
    getLocale(),
  ]);
  const slides = banners.map((banner, index) => renderBanner(
    banner,
    index,
    banner.title.trim() || t("slideLabel", { current: index + 1, total: banners.length }),
  ));

  if (banners.length === 1) return slides[0];

  return (
    <AppCarousel
      className="relative"
      deferUntilNearViewport={deferUntilNearViewport}
      direction={new Intl.Locale(locale).language === "ar" ? "rtl" : "ltr"}
      label={t("carouselLabel")}
      loop
    >
      <AppCarouselViewport className="rounded-lg">
        <AppCarouselContent>
          {banners.map((banner, index) => (
            <AppCarouselSlide
              key={banner.id}
              className="basis-full"
              label={t("slideLabel", { current: index + 1, total: banners.length })}
            >
              {slides[index]}
            </AppCarouselSlide>
          ))}
        </AppCarouselContent>
      </AppCarouselViewport>
      <AppCarouselDots
        className="absolute inset-x-0 bottom-2 mx-auto min-h-11 w-fit gap-6 rounded-full bg-gray-1000/60 px-6"
        dotLabels={banners.map((_, index) => t("goToSlide", { number: index + 1 }))}
        label={t("paginationLabel")}
      />
    </AppCarousel>
  );
}
