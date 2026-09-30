import type { Metadata } from "next";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { PageIntro } from "@/components/shared/PageIntro";
import AboutCard from "@/features/about/components/AboutCard";
import WhyusCard from "@/features/about/components/WhyusCard";
import { getAboutUsData } from "@/features/about/api/get-about-us-data";
import { getLocalizedAlternates } from "@/lib/seo/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Metadata.AboutUsPage" });
  return { title: t("title"), description: t("description"), alternates: getLocalizedAlternates(locale, "/about-us") };
}
export default async function AboutUsPage() {
  const locale = await getLocale();
  const [data, t] = await Promise.all([
    getAboutUsData(locale), getTranslations({ locale, namespace: "ContentPages.about" }),
  ]);
  const empty = ![data.hero.title, data.hero.subtitle, data.story, data.vision, data.mission].some((text) => text.trim())
    && !data.hero.imageUrl && data.features.length === 0;
  return (
    <div className="main-content-spacing">
      <Container size="default" className="mb-5">
        <Breadcrumbs label={t("breadcrumbs.label")} items={[
          { label: t("breadcrumbs.home"), href: "/" }, { label: t("title") },
        ]} />
      </Container>
      <PageIntro title={data.hero.title.trim() ? data.hero.title : t("title")}
        className="bg-success px-4 py-14 md:py-18" description={data.hero.subtitle}
        titleClassName="whitespace-pre-line break-words text-background lg:text-5xl"
        descriptionClassName="whitespace-pre-line break-words text-background mx-auto" />
      <Container size="default" className="pt-10 md:pt-12">
        {empty ? <EmptyState role="status" title={t("emptyTitle")} description={t("emptyDescription")} /> : (
          <>
            {data.hero.imageUrl ? (
              <div className="relative mb-10 aspect-video overflow-hidden rounded-lg md:mb-12">
                <Image src={data.hero.imageUrl} alt={data.hero.title} fill sizes="(max-width: 1023px) 100vw, 960px" className="object-cover" />
              </div>
            ) : null}
            {data.story.trim() ? (
              <section aria-labelledby="our-story-title">
                <h2 id="our-story-title" className="text-2xl font-bold text-foreground">{t("story.title")}</h2>
                <p className="mt-4 whitespace-pre-line break-words type-body-lg leading-7 text-[#595959]">{data.story}</p>
              </section>
            ) : null}
            {data.mission.trim() || data.vision.trim() ? (
              <div className="mt-8 lg:mt-10 grid gap-5 md:gap-6 md:grid-cols-2">
                {data.mission.trim() ? <AboutCard title={t("mission.title")} description={data.mission} /> : null}
                {data.vision.trim() ? <AboutCard title={t("vision.title")} description={data.vision} /> : null}
              </div>
            ) : null}
            {data.features.length > 0 ? (
              <section aria-labelledby="why-rafal-title" className="mt-10 md:mt-12">
                <h2 id="why-rafal-title" className="text-2xl font-bold text-foreground">{t("why.title")}</h2>
                <div className="mt-7 grid gap-5 sm:grid-cols-3">
                  {data.features.map((feature) => <WhyusCard key={feature.key} feature={feature} />)}
                </div>
              </section>
            ) : null}
          </>
        )}
      </Container>
    </div>
  );
}
