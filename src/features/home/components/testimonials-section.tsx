import { getLocale, getTranslations } from "next-intl/server";

import {
  AppCarousel,
  AppCarouselContent,
  AppCarouselNext,
  AppCarouselPosition,
  AppCarouselPrevious,
  AppCarouselSlide,
  AppCarouselViewport,
} from "@/components/ui/app-carousel";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import type { HomeTestimonial } from "@/features/home/api/get-home-data";
import { TestimonialCard } from "@/features/home/components/testimonial-card";

export async function TestimonialsSection({
  testimonials,
}: {
  testimonials: readonly HomeTestimonial[];
}) {
  if (testimonials.length === 0) return null;
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("Home.testimonials"),
  ]);
  const direction = new Intl.Locale(locale).language === "ar" ? "rtl" : "ltr";

  return (
    <Section spacing="none" aria-labelledby="testimonials-title">
      <Container>
        <h2
          id="testimonials-title"
          className="text-h3 font-medium text-foreground"
        >
          {t("title")}
        </h2>
        <AppCarousel className="mt-5" deferUntilNearViewport direction={direction} label={t("carouselLabel")}>
          <div className="mb-3 hidden justify-end gap-3 p-1 md:flex">
            <AppCarouselPrevious label={t("previous")} size="md" variant="outline" className="duration-[var(--motion-duration-fast)]" />
            <AppCarouselNext label={t("next")} size="md" variant="outline" className="duration-[var(--motion-duration-fast)]" />
          </div>
          <AppCarouselViewport>
            <AppCarouselContent className="-ms-4">
              {testimonials.map((testimonial, index) => (
                <AppCarouselSlide
                  key={testimonial.id}
                  className="basis-[85%] ps-4 sm:basis-[60%] md:basis-1/3"
                  label={t("slideLabel", { current: index + 1, total: testimonials.length })}
                >
                  <TestimonialCard
                    author={testimonial.name}
                    title={testimonial.title}
                    quote={testimonial.comment}
                    avatarUrl={testimonial.avatarUrl}
                    rating={testimonial.rating}
                    ratingLabel={t("rating", { value: testimonial.rating })}
                  />
                </AppCarouselSlide>
              ))}
            </AppCarouselContent>
          </AppCarouselViewport>
          <AppCarouselPosition className="md:hidden" label={t("positionLabel")} locale={locale} />
        </AppCarousel>
      </Container>
    </Section>
  );
}
