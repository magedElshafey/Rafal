import { getTranslations } from "next-intl/server";

import { HomePromoBanner } from "@/features/home/components/home-promo-banner";

export async function GiftsPromoBanner() {
  const t = await getTranslations("Home.promoBanners");

  return (
    <HomePromoBanner
      alt={t("giftsAlt")}
      aspectRatio="1320 / 424"
      href="/products"
      imageUrl="/images/home/gifts-banner.png"
    />
  );
}
