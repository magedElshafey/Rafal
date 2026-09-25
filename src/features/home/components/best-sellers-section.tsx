import { getLocale, getTranslations } from "next-intl/server";

import { ProductShelf } from "@/features/home/components/product-shelf";
import type { HomeProduct } from "@/features/home/types/home-product.types";

export async function BestSellersSection({
  products,
}: {
  products: readonly HomeProduct[];
}) {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("Home.productSections"),
  ]);
  return (
    <ProductShelf
      carouselLabel={t("featured.carouselLabel")}
      labels={{
        discount: t("badges.discount"),
        new: t("badges.new"),
        personalization: t("badges.personalization"),
        rating: (value) => t("rating", { value }),
        reviews: (count) => t("reviews", { count }),
      }}
      locale={locale}
      products={products}
      title={t("featured.title")}
      viewAllHref="/products"
      viewAllLabel={t("viewAll")}
    />
  );
}
