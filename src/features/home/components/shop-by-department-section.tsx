import { getLocale, getTranslations } from "next-intl/server";

import {
  AppCarousel,
  AppCarouselContent,
  AppCarouselSlide,
  AppCarouselViewport,
} from "@/components/ui/app-carousel";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import type { Category } from "@/features/categories/types";
import { DepartmentCard } from "@/features/home/components/department-card";

export async function ShopByDepartmentSection({
  categories,
}: {
  categories: readonly Category[];
}) {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("Home.departments"),
  ]);
  if (categories.length === 0) return null;

  const direction = new Intl.Locale(locale).language === "ar" ? "rtl" : "ltr";

  return (
    <Section spacing="none" aria-labelledby="departments-title">
      <Container>
        <h2
          id="departments-title"
          className="text-h3 font-medium text-foreground"
        >
          {t("title")}
        </h2>
        <AppCarousel
          className="mt-5"
          direction={direction}
          dragFree
          label={t("carouselLabel")}
          slidesToScroll="auto"
        >
          <AppCarouselViewport>
            <AppCarouselContent className="-ms-4">
              {categories.map((category) => (
                <AppCarouselSlide
                  key={category.id}
                  className="basis-[60%] ps-4 min-[480px]:basis-[42%] sm:basis-1/3 lg:basis-1/6"
                  label={category.name}
                >
                  <DepartmentCard
                    href={`/categories/${category.slug}`}
                    imageAlt={category.name}
                    imageUrl={category.imageUrl}
                    title={category.name}
                  />
                </AppCarouselSlide>
              ))}
            </AppCarouselContent>
          </AppCarouselViewport>
        </AppCarousel>
      </Container>
    </Section>
  );
}
