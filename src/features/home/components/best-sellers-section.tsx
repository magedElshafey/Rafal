import { getLocale, getTranslations } from "next-intl/server";

import { ProductShelf } from "@/features/home/components/product-shelf";
import type { HomeProduct } from "@/features/home/types/home-product.types";

export async function BestSellersSection({
  accountId,
  products,
}: {
  accountId: string | null;
  products: readonly HomeProduct[];
}) {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("Home.productSections"),
  ]);
  return (
    <ProductShelf
      accountId={accountId}
      previousLabel={t("previous")}
      nextLabel={t("next")}
      carouselLabel={t("bestSellers.carouselLabel")}
      labels={{
        discount: t("badges.discount"),
        new: t("badges.new"),
        personalization: t("badges.personalization"),
        rating: (value) => t("rating", { value }),
        reviews: (count) => t("reviews", { count }),
      }}
      locale={locale}
      products={products}
      title={t("bestSellers.title")}
      viewAllHref="/products"
      viewAllLabel={t("viewAll")}
    />
  );
}
