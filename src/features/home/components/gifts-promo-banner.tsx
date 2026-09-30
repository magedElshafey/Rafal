import { HomePromoBanner } from "@/features/home/components/home-promo-banner";
import type { Banner } from "@/features/home/types";

export function GiftsPromoBanner({ banner }: { banner: Banner | null }) {
  if (!banner) return null;

  return (
    <HomePromoBanner
      alt={banner.title}
      aspectRatio="1320 / 424"
      href={banner.href ?? undefined}
      imageUrl={banner.imageUrl}
    />
  );
}
