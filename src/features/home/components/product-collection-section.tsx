import { getLocale, getTranslations } from "next-intl/server";

import { ProductShelf } from "@/features/home/components/product-shelf";
import { getStorefrontProductCollections } from "@/features/home/data/home-products";

export async function ProductCollectionSection() {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("Home.productSections"),
  ]);
  const { featuredProducts } = getStorefrontProductCollections(locale);

  return (
    <ProductShelf
      carouselLabel={t("collection.carouselLabel")}
      labels={{
        discount: t("badges.discount"),
        new: t("badges.new"),
        personalization: t("badges.personalization"),
        rating: (value) => t("rating", { value }),
      }}
      locale={locale}
      products={featuredProducts}
      title={t("collection.title")}
      viewAllHref="/products"
      viewAllLabel={t("viewAll")}
    />
  );
}
