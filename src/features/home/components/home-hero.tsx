import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";

import {
  AppCarousel,
  AppCarouselContent,
  AppCarouselDots,
  AppCarouselSlide,
  AppCarouselViewport,
} from "@/components/ui/app-carousel";
import { ErrorState } from "@/components/ui/error-state";
import { getBanners } from "@/features/home/api/get-banners";
import {
  HomeHeroFrame,
  HomeHeroLayout,
} from "@/features/home/components/home-hero-layout";
import { HomeHeroRetry } from "@/features/home/components/home-hero-retry";
import type { Banner } from "@/features/home/types";
import { Link } from "@/i18n/navigation";

function BannerImage({
  banner,
  preload,
}: {
  banner: Banner;
  preload: boolean;
}) {
  const image = (
    <Image
      fill
      alt={banner.title}
      className="object-cover"
      preload={preload}
      sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1383px) calc(100vw - 64px), 1320px"
      src={banner.imageUrl}
    />
  );

  if (!banner.href) return image;

  return banner.href.startsWith("/") ? (
    <Link href={banner.href} className="block size-full">
      {image}
    </Link>
  ) : (
    <a href={banner.href} className="block size-full">
      {image}
    </a>
  );
}

export async function HomeHero() {
  const [t, locale, banners] = await Promise.all([
    getTranslations("Home.hero"),
    getLocale(),
    getBanners().catch(() => null),
  ]);

  if (banners === null) {
    return (
      <HomeHeroLayout>
        <HomeHeroFrame>
          <ErrorState
            role="alert"
            className="size-full justify-center rounded-none border-0"
            title={t("errorTitle")}
            description={t("errorDescription")}
            action={
              <HomeHeroRetry label={t("retry")} pendingLabel={t("retrying")} />
            }
          />
        </HomeHeroFrame>
      </HomeHeroLayout>
    );
  }

  if (banners.length === 0) return null;

  const direction = (
    new Intl.Locale(locale) as Intl.Locale & {
      textInfo: { direction: "ltr" | "rtl" };
    }
  ).textInfo.direction;

  return (
    <HomeHeroLayout>
      <AppCarousel
        className="w-full"
        direction={direction}
        label={t("carouselLabel")}
        loop={banners.length > 1}
      >
        <HomeHeroFrame>
          <AppCarouselViewport className="size-full">
            <AppCarouselContent className="h-full">
              {banners.map((banner, index) => (
                <AppCarouselSlide
                  key={banner.id}
                  className="relative h-full basis-full"
                  label={t("slideLabel", {
                    current: index + 1,
                    total: banners.length,
                  })}
                >
                  <BannerImage banner={banner} preload={index === 0} />
                </AppCarouselSlide>
              ))}
            </AppCarouselContent>
          </AppCarouselViewport>
        </HomeHeroFrame>

        <div className="mt-3 h-2">
          <AppCarouselDots
            className="h-full gap-1"
            dotClassName="bg-gray-200 focus-visible:ring-gold-500 focus-visible:ring-offset-gray-0"
            dotLabels={banners.map((_, index) =>
              t("goToSlide", { number: index + 1 }),
            )}
            label={t("paginationLabel")}
            selectedDotClassName="w-5 bg-gold-500"
          />
        </div>
      </AppCarousel>
    </HomeHeroLayout>
  );
}
