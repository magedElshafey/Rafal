import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { CrownIcon, HeadsetIcon, TruckIcon } from "@/components/ui/icons";
import { getLocalizedAlternates } from "@/lib/seo/alternates";
import { PageIntro } from "@/components/shared/PageIntro";
import AboutCard from "@/features/about/components/AboutCard";
import WhyusCard from "@/features/about/components/WhyusCard";
import StoreRate from "@/features/about/components/StoreRate";

const benefitKeys = ["shipping", "quality", "personalization"] as const;
const benefitIcons = {
  shipping: TruckIcon,
  quality: CrownIcon,
  personalization: HeadsetIcon,
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("ContentPages.about");
  return {
    title: t("title"),
    description: t("heroDescription"),
    alternates: getLocalizedAlternates(locale, "/about"),
  };
}
const aboutData = ["mission", "vision"] as const;
export default async function AboutPage() {
  const t = await getTranslations("ContentPages.about");

  return (
    <div className="">
      <PageIntro
        title={t("title")}
        className="bg-success px-4 py-14 md:py-18"
        description={t("heroDescription")}
        titleClassName="text-background lg:text-5xl"
        descriptionClassName="text-background mx-auto"
      />

      <Container size="default" className="pt-10 md:pt-12">
        <section aria-labelledby="our-story-title">
          <h2
            id="our-story-title"
            className="text-2xl font-bold text-foreground"
          >
            {t("story.title")}
          </h2>
          <p className="mt-4 type-body-lg leading-7 text-[#595959]">
            {t("story.description")}
          </p>
          <div className="mt-8 lg:mt-10 grid gap-5 md:gap-6 md:grid-cols-2">
            {aboutData.map((key) => (
              <AboutCard
                title={t(`${key}.title`)}
                description={t(`${key}.description`)}
                key={key}
              />
            ))}
          </div>
        </section>
        <section aria-labelledby="why-rafal-title" className="mt-10 md:mt-12">
          <h2
            id="why-rafal-title"
            className="text-2xl font-bold text-foreground"
          >
            {t("why.title")}
          </h2>
          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            {benefitKeys.map((key) => {
              const Icon = benefitIcons[key];
              return (
                <WhyusCard
                  key={key}
                  description={t(`why.items.${key}.description`)}
                  Icon={Icon}
                  title={t(`why.items.${key}.title`)}
                />
              );
            })}
          </div>
        </section>
        <StoreRate
          description={t("rating.description")}
          title={t("rating.title")}
          label={t("rating.starsLabel")}
          rate={5}
        />
      </Container>
    </div>
  );
}
