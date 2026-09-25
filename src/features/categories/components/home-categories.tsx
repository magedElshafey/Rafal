import { getLocale, getTranslations } from "next-intl/server";

import {
  AppCarousel,
  AppCarouselContent,
  AppCarouselSlide,
  AppCarouselViewport,
} from "@/components/ui/app-carousel";
import {
  CategoriesSectionLayout,
  categorySlideClassName,
} from "@/features/categories/components/categories-section-layout";
import { CategoryCard } from "@/features/categories/components/category-card";
import type { Category } from "@/features/categories/types";

const headingId = "home-categories-heading";

export async function HomeCategories({
  categories,
}: {
  categories: readonly Category[];
}) {
  const [t, locale] = await Promise.all([
    getTranslations("Home.categories"),
    getLocale(),
  ]);

  if (categories.length === 0) return null;

  const direction = (
    new Intl.Locale(locale) as Intl.Locale & {
      textInfo: { direction: "ltr" | "rtl" };
    }
  ).textInfo.direction;

  return (
    <CategoriesSectionLayout heading={t("title")} headingId={headingId}>
      <AppCarousel
        autoplay
        direction={direction}
        label={t("carouselLabel")}
        loop={categories.length > 1}
      >
        <AppCarouselViewport>
          <AppCarouselContent>
            {categories.map((category, index) => (
              <AppCarouselSlide
                key={category.id}
                className={categorySlideClassName}
                label={t("slideLabel", {
                  current: index + 1,
                  total: categories.length,
                })}
              >
                <CategoryCard category={category} />
              </AppCarouselSlide>
            ))}
          </AppCarouselContent>
        </AppCarouselViewport>
      </AppCarousel>
    </CategoriesSectionLayout>
  );
}
