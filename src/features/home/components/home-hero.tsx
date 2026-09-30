import Image from "next/image";

import {
  HomeHeroFrame,
  HomeHeroLayout,
} from "@/features/home/components/home-hero-layout";
import type { Banner } from "@/features/home/types";
import { Link } from "@/i18n/navigation";

export function HomeHero({ banner }: { banner: Banner | null }) {
  if (!banner) return null;

  const image = (
    <Image
      fill
      alt={banner.title}
      className="object-cover"
      preload
      sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1383px) calc(100vw - 64px), 1320px"
      src={banner.imageUrl}
    />
  );
  const linkClassName =
    "block size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

  return (
    <HomeHeroLayout>
      <HomeHeroFrame>
        {banner.href ? (
          banner.href.startsWith("/") ? (
            <Link href={banner.href} className={linkClassName}>
              {image}
            </Link>
          ) : (
            <a href={banner.href} className={linkClassName}>
              {image}
            </a>
          )
        ) : (
          image
        )}
      </HomeHeroFrame>
    </HomeHeroLayout>
  );
}
