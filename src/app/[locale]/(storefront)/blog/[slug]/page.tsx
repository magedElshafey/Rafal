import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { AppImage } from "@/components/ui/app-image";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { ArticleMeta } from "@/features/blog/components/ArticleMeta";
import { BlogCard } from "@/features/blog/components/BlogCard";
import { getBlogPostForRequest } from "@/features/blog/api/get-blog-post";
import { serverEnv } from "@/config/server-env";
import { getLocalizedAlternates } from "@/lib/seo/alternates";
import { Badge } from "@/components/ui/badge";

type ArticlePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const result = await getBlogPostForRequest(slug, locale);
  if (result.kind === "not-found") return {};
  const article = result.post;
  const pathname = `/blog/${encodeURIComponent(article.slug)}`;
  return {
    title: article.title,
    description: article.excerpt,
    alternates: getLocalizedAlternates(locale, pathname),
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.publishedAt,
      url: new URL(`/${locale}${pathname}`, serverEnv.siteUrl),
      ...(article.authorName !== null ? { authors: [article.authorName] } : {}),
      ...(article.coverUrl !== null ? { images: [{ url: article.coverUrl, alt: article.title }] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const result = await getBlogPostForRequest(slug, locale);
  if (result.kind === "not-found") notFound();
  const article = result.post;
  const t = await getTranslations({ locale, namespace: "ContentPages.blog" });
  const paragraphs = article.body.replace(/\r\n?/g, "\n")
    .split(/\n[\t ]*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
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
          {article.category !== null ? (
            <Badge className="bg-success/10 text-success">
              {article.category.name}
            </Badge>
          ) : null}
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            {article.title}
          </h1>
          <div className="flex justify-center">
            <ArticleMeta
              date={article.publishedAt}
              author={article.authorName}
              locale={locale}
              readingTime={t("readingTime", { minutes: article.readingTimeMinutes })}
            />
          </div>
        </header>
        <AppImage
          src={article.coverUrl}
          alt={article.coverUrl ? article.title : ""}
          aspectRatio="16 / 9"
          sizes="(max-width: 1024px) 100vw, 1024px"
          preload={article.coverUrl !== null}
          frameClassName="mt-5 rounded-lg"
        />
      </Container>
      <Container size="wide" className="mt-6 md:mt-8">
        <div className="mx-auto max-w-prose space-y-6 type-body-lg leading-8 text-gray-600">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line">{paragraph}</p>
          ))}
        </div>
        {article.related.length > 0 ? (
          <section
            aria-labelledby="related-articles-title"
            className="mt-10 md:mt-12"
          >
            <h2 id="related-articles-title" className="text-h2 font-bold">
              {t("related")}
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {article.related.map((item) => (
                <BlogCard
                  key={item.id}
                  article={item}
                  locale={locale}
                  variant="compact"
                />
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </article>
  );
}
