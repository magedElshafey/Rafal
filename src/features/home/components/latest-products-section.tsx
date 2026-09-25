"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { ShoppingBagIcon } from "@/components/ui/icons";
import type { Category } from "@/features/categories/types";
import { ProductShelf } from "@/features/home/components/product-shelf";
import type { HomeProduct } from "@/features/home/types/home-product.types";

export function LatestProductsSection({
  categories,
  products,
}: {
  categories: readonly Category[];
  products: readonly HomeProduct[];
}) {
  const locale = useLocale();
  const t = useTranslations("Home.productSections");
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const activeCategory =
    activeCategoryId === null
      ? null
      : (categories.find((category) => category.id === activeCategoryId) ??
        null);
  const activeCategoryIds = activeCategory
    ? new Set([
        activeCategory.id,
        ...activeCategory.children.map((category) => category.id),
      ])
    : null;
  const visibleProducts = activeCategoryIds
    ? products.filter((product) => activeCategoryIds.has(product.categoryId))
    : products;

  return (
    <ProductShelf
      carouselLabel={t("latest.carouselLabel")}
      emptyContent={
        products.length > 0 && visibleProducts.length === 0 ? (
          <ErrorState
            role="status"
            className="py-8"
            description={t("latest.emptyDescription")}
            icon={<ShoppingBagIcon className="mb-3 text-gray-400" size={32} />}
            title={t("latest.emptyTitle")}
          />
        ) : undefined
      }
      headerContent={
        <div
          aria-label={t("latest.filtersLabel")}
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
        >
          <div className="flex w-max gap-2">
            <Button
              aria-pressed={activeCategory === null}
              className="h-8 rounded-full px-4 type-body-sm"
              onClick={() => setActiveCategoryId(null)}
              size="sm"
              variant={activeCategory === null ? "secondary" : "outline"}
            >
              {t("latest.filters.all")}
            </Button>
            {categories.map((category) => {
              const selected = activeCategory?.id === category.id;

              return (
                <Button
                  key={category.id}
                  aria-pressed={selected}
                  className="h-8 rounded-full px-4 type-body-sm"
                  onClick={() => setActiveCategoryId(category.id)}
                  size="sm"
                  variant={selected ? "secondary" : "outline"}
                >
                  {category.name}
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
        reviews: (count) => t("reviews", { count }),
      }}
      locale={locale}
      products={visibleProducts}
      title={t("latest.title")}
      viewAllHref="/products"
      viewAllLabel={t("viewAll")}
    />
  );
}
