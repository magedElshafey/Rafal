import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { BlogCard } from "@/features/blog/components/BlogCard";
import { FeaturedArticle } from "@/features/blog/components/FeaturedArticle";
import { getLocalizedArticles } from "@/features/blog/data/articles";
import type { BlogLocale } from "@/features/blog/types";
import { PageIntro } from "@/components/shared/PageIntro";
import { getLocalizedAlternates } from "@/lib/seo/alternates";

type BlogPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale: BlogLocale = locale === "en" ? "en" : "ar";
  const t = await getTranslations({
    locale: resolvedLocale,
    namespace: "ContentPages.blog",
  });
  return {
    title: t("title"),
    description: t("description"),
    alternates: getLocalizedAlternates(resolvedLocale, "/blog"),
  };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale } = await params;
  const resolvedLocale: BlogLocale = locale === "en" ? "en" : "ar";
  const [t, articles] = await Promise.all([
    getTranslations({ locale: resolvedLocale, namespace: "ContentPages.blog" }),
    Promise.resolve(getLocalizedArticles(resolvedLocale)),
  ]);
  const featured = articles.find((article) => article.featured);
  const remaining = articles.filter((article) => !article.featured);

  return (
    <Container size="wide" className="pb-16 pt-4 md:pb-24 md:pt-8">
      <PageIntro
        title={t("title")}
        description={t("description")}
        className="mb-8 md:mb-12"
      />
      {featured ? (
        <FeaturedArticle
          article={featured}
          featuredLabel={t("featured")}
          locale={resolvedLocale}
        />
      ) : null}
      {remaining.length ? (
        <section
          aria-label={t("allArticles")}
          className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {remaining.map((article) => (
            <BlogCard
              key={article.id}
              article={article}
              locale={resolvedLocale}
            />
          ))}
        </section>
      ) : (
        <p className="py-16 text-center type-body-lg text-gray-500">
          {t("empty")}
        </p>
      )}
      <div className="mt-8 flex justify-center">
        <Button type="button" variant="outline">
          {t("viewMore")}
        </Button>
      </div>
    </Container>
  );
}
