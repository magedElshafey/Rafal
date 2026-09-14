import { getTranslations } from "next-intl/server";

import { HomePromoBanner } from "@/features/home/components/home-promo-banner";

export async function MensPromoBanner() {
  const t = await getTranslations("Home.promoBanners");

  return (
    <HomePromoBanner
      alt={t("menAlt")}
      aspectRatio="1320 / 403"
      href="/products"
      imageUrl="/images/home/mens-banner.png"
    />
  );
}
