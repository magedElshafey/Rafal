import Image from "next/image";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { BannerMotion } from "@/features/home/components/banner-motion";
import { HomeBannerCarousel } from "@/features/home/components/home-banner-carousel";
import type { Banner } from "@/features/home/types";
import { Link } from "@/i18n/navigation";

type HomePromoBannerProps = {
  banners: readonly Banner[];
  aspectRatio: string;
};

export function HomePromoBanner({ banners, aspectRatio }: HomePromoBannerProps) {
  if (banners.length === 0) return null;

  return (
    <Section spacing="none">
      <Container>
        <BannerMotion>
          <HomeBannerCarousel
            banners={banners}
            deferUntilNearViewport
            renderBanner={(banner, _, alt) => {
              const image = (
                <Image
                  fill
                  alt={alt}
                  className="motion-banner-promo-image object-cover"
                  sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1439px) calc(100vw - 64px), 1376px"
                  src={banner.imageUrl}
                />
              );

              return banner.href ? (
                <Link
                  href={banner.href}
                  className="relative block w-full overflow-hidden rounded-lg bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  style={{ aspectRatio }}
                >
                  {image}
                </Link>
              ) : (
                <div
                  className="relative w-full overflow-hidden rounded-lg bg-gray-100"
                  style={{ aspectRatio }}
                >
                  {image}
                </div>
              );
            }}
          />
        </BannerMotion>
      </Container>
    </Section>
  );
}
