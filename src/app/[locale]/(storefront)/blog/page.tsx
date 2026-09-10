import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { BlogCard } from "@/features/blog/components/BlogCard";
import { FeaturedArticle } from "@/features/blog/components/FeaturedArticle";
import { getLocalizedArticles } from "@/features/blog/data/articles";
import { PageIntro } from "@/components/shared/PageIntro";
import { getLocalizedAlternates } from "@/lib/seo/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("ContentPages.blog");
  return {
    title: t("title"),
    description: t("description"),
    alternates: getLocalizedAlternates(locale, "/blog"),
  };
}

export default async function BlogPage() {
  const locale = await getLocale();
  const [t, articles] = await Promise.all([
    getTranslations("ContentPages.blog"),
    Promise.resolve(getLocalizedArticles(locale)),
  ]);
  const featured = articles.find((article) => article.featured);
  const remaining = articles.filter((article) => !article.featured);

  return (
    <Container className="main-content-spacing">
      <PageIntro
        title={t("title")}
        description={t("description")}
        className="mb-8 md:mb-12 text-start"
        descriptionClassName="mt-6 sm:mt-7 md:mt-8"
      />
      {featured ? (
        <FeaturedArticle
          article={featured}
          featuredLabel={t("featured")}
          locale={locale}
        />
      ) : null}
      {remaining.length ? (
        <section
          aria-label={t("allArticles")}
          className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {remaining.map((article) => (
            <BlogCard key={article.id} article={article} locale={locale} />
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
