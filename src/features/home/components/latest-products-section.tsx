"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ProductShelf } from "@/features/home/components/product-shelf";
import { latestProducts } from "@/features/home/data/home-products";
import type { HomeProductCategory } from "@/features/home/types/home-product.types";

type LatestProductFilter = "all" | HomeProductCategory;

const filterKeys = [
  "all",
  "jewelry",
  "perfumes",
  "accessories",
] as const satisfies readonly LatestProductFilter[];

export function LatestProductsSection() {
  const locale = useLocale();
  const t = useTranslations("Home.productSections");
  const [activeFilter, setActiveFilter] = useState<LatestProductFilter>("all");
  const visibleProducts =
    activeFilter === "all"
      ? latestProducts
      : latestProducts.filter((product) => product.category === activeFilter);

  return (
    <ProductShelf
      carouselLabel={t("latest.carouselLabel")}
      headerContent={
        <div
          aria-label={t("latest.filtersLabel")}
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
        >
          <div className="flex w-max gap-2">
            {filterKeys.map((filter) => {
              const selected = activeFilter === filter;

              return (
                <Button
                  key={filter}
                  aria-pressed={selected}
                  className="h-8 rounded-full px-4 type-body-sm"
                  onClick={() => setActiveFilter(filter)}
                  size="sm"
                  variant={selected ? "secondary" : "outline"}
                >
                  {t(`latest.filters.${filter}`)}
                </Button>
              );
            })}
          </div>
        </div>
      }
      labels={{
        discount: t("badges.discount"),
        new: t("badges.new"),
        personalization: t("badges.personalization"),
        rating: (value) => t("rating", { value }),
      }}
      locale={locale}
      products={visibleProducts}
      title={t("latest.title")}
      viewAllHref="/products"
      viewAllLabel={t("viewAll")}
    />
  );
}
