import { getLocale, getTranslations } from "next-intl/server";

import {
  AppCarousel,
  AppCarouselContent,
  AppCarouselSlide,
  AppCarouselViewport,
} from "@/components/ui/app-carousel";
import { ErrorState } from "@/components/ui/error-state";
import { getCategories } from "@/features/categories/api/get-categories";
import { CategoriesRetry } from "@/features/categories/components/categories-retry";
import {
  CategoriesSectionLayout,
  categorySlideClassName,
} from "@/features/categories/components/categories-section-layout";
import { CategoryCard } from "@/features/categories/components/category-card";

const headingId = "home-categories-heading";

export async function HomeCategories() {
  const [t, locale, categories] = await Promise.all([
    getTranslations("Home.categories"),
    getLocale(),
    getCategories().catch(() => null),
  ]);

  if (categories === null) {
    return (
      <CategoriesSectionLayout heading={t("title")} headingId={headingId}>
        <ErrorState
          role="alert"
          className="min-h-[152px] justify-center rounded-none border-0 bg-transparent"
          title={t("errorTitle")}
          description={t("errorDescription")}
          action={
            <CategoriesRetry
              label={t("retry")}
              pendingLabel={t("retrying")}
            />
          }
        />
      </CategoriesSectionLayout>
    );
  }

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
