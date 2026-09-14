import { getLocale, getTranslations } from "next-intl/server";

import {
  AppCarousel,
  AppCarouselContent,
  AppCarouselSlide,
  AppCarouselViewport,
} from "@/components/ui/app-carousel";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { DepartmentCard } from "@/features/home/components/department-card";
import { departments } from "@/features/home/data/home-content";

export async function ShopByDepartmentSection() {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("Home.departments"),
  ]);
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
              {departments.map((department) => (
                <AppCarouselSlide
                  key={department.id}
                  className="basis-[60%] ps-4 min-[480px]:basis-[42%] sm:basis-1/3 lg:basis-1/6"
                  label={t(`items.${department.id}.title`)}
                >
                  <DepartmentCard
                    href={department.href}
                    imageAlt={t(`items.${department.id}.imageAlt`)}
                    imageUrl={department.imageUrl}
                    title={t(`items.${department.id}.title`)}
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
