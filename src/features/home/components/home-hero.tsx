import Image from "next/image";

import { HomeBannerCarousel } from "@/features/home/components/home-banner-carousel";
import {
  HomeHeroFrame,
  HomeHeroLayout,
} from "@/features/home/components/home-hero-layout";
import type { Banner } from "@/features/home/types";
import { Link } from "@/i18n/navigation";

export function HomeHero({ banners }: { banners: readonly Banner[] }) {
  if (banners.length === 0) return null;

  return (
    <HomeHeroLayout>
      <HomeBannerCarousel
        banners={banners}
        renderBanner={(banner, index, alt) => {
          const image = (
            <Image
              fill
              alt={alt}
              className="motion-banner-hero-image object-cover"
              preload={index === 0}
              sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1383px) calc(100vw - 64px), 1320px"
              src={banner.imageUrl}
            />
          );

          return (
            <HomeHeroFrame>
              {banner.href ? (
                <Link
                  href={banner.href}
                  className="block size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  {image}
                </Link>
              ) : image}
            </HomeHeroFrame>
          );
        }}
      />
    </HomeHeroLayout>
  );
}
