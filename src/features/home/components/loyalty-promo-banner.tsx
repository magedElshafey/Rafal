import { getTranslations } from "next-intl/server";

import { HomePromoBanner } from "@/features/home/components/home-promo-banner";

export async function LoyaltyPromoBanner() {
  const t = await getTranslations("Home.promoBanners");

  return (
    <HomePromoBanner
      alt={t("loyaltyAlt")}
      aspectRatio="1320 / 335"
      imageUrl="/images/home/loyalty-banner.png"
    />
  );
}
