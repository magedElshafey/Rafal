import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { TestimonialCard } from "@/features/home/components/testimonial-card";
import { testimonials } from "@/features/home/data/home-content";

export async function TestimonialsSection() {
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
              author={t(`items.${testimonial.id}.author`)}
              quote={t(`items.${testimonial.id}.quote`)}
              rating={testimonial.rating}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}
