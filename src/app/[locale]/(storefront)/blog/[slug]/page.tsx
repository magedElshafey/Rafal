import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { AppImage } from "@/components/ui/app-image";
import { Container } from "@/components/ui/container";
import { ArticleMeta } from "@/features/blog/components/ArticleMeta";
import { BlogCard } from "@/features/blog/components/BlogCard";
import { Breadcrumbs } from "@/features/blog/components/Breadcrumbs";
import { blogArticles, getLocalizedArticle, getLocalizedArticles } from "@/features/blog/data/articles";
import type { BlogLocale } from "@/features/blog/types";
import { getLocalizedAlternates } from "@/lib/seo/alternates";

type ArticlePageProps = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return blogArticles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const resolvedLocale: BlogLocale = locale === "en" ? "en" : "ar";
  const article = getLocalizedArticle(resolvedLocale, slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    alternates: getLocalizedAlternates(resolvedLocale, `/blog/${article.slug}`),
    openGraph: { title: article.title, description: article.excerpt, type: "article", publishedTime: article.publishedAt },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { locale, slug } = await params;
  const resolvedLocale: BlogLocale = locale === "en" ? "en" : "ar";
  const article = getLocalizedArticle(resolvedLocale, slug);
  if (!article) notFound();
  const t = await getTranslations({ locale: resolvedLocale, namespace: "ContentPages.blog" });
  const related = getLocalizedArticles(resolvedLocale).filter((item) => item.slug !== slug).slice(0, 3);

  return (
    <article className="pb-16 pt-3 md:pb-24 md:pt-6">
      <Container size="wide">
        <Breadcrumbs homeLabel={t("breadcrumbs.home")} blogLabel={t("breadcrumbs.blog")} current={article.title} />
      </Container>
      <Container size="default" className="mt-8">
        <header className="text-center">
          <p className="mx-auto w-fit rounded-full bg-success/10 px-3 py-1 type-body-sm font-medium text-success">{article.category}</p>
          <h1 className="mt-4 text-h1 font-bold text-gray-1000 md:text-display">{article.title}</h1>
          <div className="mt-4 flex justify-center"><ArticleMeta date={article.publishedAt} author={t("author")} locale={resolvedLocale} readingTime={t("readingTime", { minutes: article.readingTime })} /></div>
        </header>
        <AppImage src={article.image.src} alt={article.image.alt} aspectRatio="16 / 9" sizes="(max-width: 1024px) 100vw, 1024px" preload frameClassName="mt-7 rounded-lg md:mt-9" />
      </Container>
      <Container size="wide" className="mt-6 md:mt-8">
        <div className="space-y-6 type-body-lg leading-8 text-gray-600">
          {article.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        <section aria-labelledby="related-articles-title" className="mt-10 md:mt-12">
          <h2 id="related-articles-title" className="text-h2 font-bold">{t("related")}</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => <BlogCard key={item.id} article={item} locale={resolvedLocale} variant="compact" />)}
          </div>
        </section>
      </Container>
    </article>
  );
}

