import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { AppImage } from "@/components/ui/app-image";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { ArticleMeta } from "@/features/blog/components/ArticleMeta";
import { BlogCard } from "@/features/blog/components/BlogCard";
import {
  blogArticles,
  getLocalizedArticle,
  getLocalizedArticles,
} from "@/features/blog/data/articles";
import { getLocalizedAlternates } from "@/lib/seo/alternates";
import { Badge } from "@/components/ui/badge";

type ArticlePageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return blogArticles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const article = getLocalizedArticle(locale, slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    alternates: getLocalizedAlternates(locale, `/blog/${article.slug}`),
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.publishedAt,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const article = getLocalizedArticle(locale, slug);
  if (!article) notFound();
  const t = await getTranslations({ locale, namespace: "ContentPages.blog" });
  const related = getLocalizedArticles(locale)
    .filter((item) => item.slug !== slug)
    .slice(0, 3);
  const breadcrumbItems = [
    { label: t("breadcrumbs.home"), href: "/" },
    { label: t("breadcrumbs.blog"), href: "/blog" },
    { label: article.title },
  ] satisfies readonly [BreadcrumbItem, ...BreadcrumbItem[]];

  return (
    <article className="main-content-spacing">
      <Container>
        <Breadcrumbs items={breadcrumbItems} label={t("breadcrumbs.label")} />
      </Container>
      <Container size="default" className="mt-6">
        <header className="text-center space-y-4">
          <Badge className="bg-success/10 text-success">
            {article.category}
          </Badge>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            {article.title}
          </h1>
          <div className="flex justify-center">
            <ArticleMeta
              date={article.publishedAt}
              author={t("author")}
              locale={locale}
              readingTime={t("readingTime", { minutes: article.readingTime })}
            />
          </div>
        </header>
        <AppImage
          src={article.image.src}
          alt={article.image.alt}
          aspectRatio="16 / 9"
          sizes="(max-width: 1024px) 100vw, 1024px"
          preload
          frameClassName="mt-5 rounded-lg"
        />
      </Container>
      <Container size="wide" className="mt-6 md:mt-8">
        <div className="space-y-6 type-body-lg leading-8 text-gray-600">
          {article.content.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <section
          aria-labelledby="related-articles-title"
          className="mt-10 md:mt-12"
        >
          <h2 id="related-articles-title" className="text-h2 font-bold">
            {t("related")}
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <BlogCard
                key={item.id}
                article={item}
                locale={locale}
                variant="compact"
              />
            ))}
          </div>
        </section>
      </Container>
    </article>
  );
}
