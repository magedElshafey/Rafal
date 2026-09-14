import { getLocale, getTranslations } from "next-intl/server";

import { ProductShelf } from "@/features/home/components/product-shelf";
import { bestSellerProducts } from "@/features/home/data/home-products";

export async function BestSellersSection() {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("Home.productSections"),
  ]);

  return (
    <ProductShelf
      carouselLabel={t("bestSellers.carouselLabel")}
      labels={{
        discount: t("badges.discount"),
        new: t("badges.new"),
        personalization: t("badges.personalization"),
        rating: (value) => t("rating", { value }),
      }}
      locale={locale}
      products={bestSellerProducts}
      title={t("bestSellers.title")}
      viewAllHref="/products"
      viewAllLabel={t("viewAll")}
    />
  );
}
