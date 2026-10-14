import { HomePromoBanner } from "@/features/home/components/home-promo-banner";
import type { Banner } from "@/features/home/types";

export function LoyaltyPromoBanner({ banners }: { banners: readonly Banner[] }) {

  return (
    <HomePromoBanner
      banners={banners}
      aspectRatio="1320 / 335"
    />
  );
}
