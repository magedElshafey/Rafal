import { getLocale, getTranslations } from "next-intl/server";

import { ProductShelf } from "@/features/home/components/product-shelf";
import type { HomeProduct } from "@/features/home/types/home-product.types";

type ProductCollectionSectionProps = {
  kind: "onDiscount" | "personalizable";
  products: readonly HomeProduct[];
};

export async function ProductCollectionSection({
  kind,
  products,
}: ProductCollectionSectionProps) {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("Home.productSections"),
  ]);
  const copy =
    kind === "onDiscount"
      ? {
          carouselLabel: t("onDiscount.carouselLabel"),
          title: t("onDiscount.title"),
        }
      : {
          carouselLabel: t("personalizable.carouselLabel"),
          title: t("personalizable.title"),
        };

  return (
    <ProductShelf
      carouselLabel={copy.carouselLabel}
      labels={{
        discount: t("badges.discount"),
        new: t("badges.new"),
        personalization: t("badges.personalization"),
        rating: (value) => t("rating", { value }),
      }}
      locale={locale}
      products={products}
      title={copy.title}
      viewAllHref="/products"
      viewAllLabel={t("viewAll")}
    />
  );
}
