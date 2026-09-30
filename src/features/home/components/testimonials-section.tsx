import { getTranslations } from "next-intl/server";

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
  const t = await getTranslations("Home.testimonials");

  return (
    <Section spacing="none" aria-labelledby="testimonials-title">
      <Container>
        <h2
          id="testimonials-title"
          className="text-h3 font-medium text-foreground"
        >
          {t("title")}
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <TestimonialCard
              key={testimonial.id}
              author={testimonial.name}
              title={testimonial.title}
              quote={testimonial.comment}
              avatarUrl={testimonial.avatarUrl}
              rating={testimonial.rating}
              ratingLabel={t("rating", { value: testimonial.rating })}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}
