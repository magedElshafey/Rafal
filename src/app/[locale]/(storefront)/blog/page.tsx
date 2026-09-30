import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { PageIntro } from "@/components/shared/PageIntro";
import { FeaturedArticle } from "@/features/blog/components/FeaturedArticle";
import { BlogGrid } from "@/features/blog/components/blog-grid";
import { BlogListing } from "@/features/blog/components/blog-listing";
import { getBlogPosts } from "@/features/blog/api/get-blog-posts";
import { regularBlogArticles } from "@/features/blog/api/blog-mappers";
import { getLocalizedAlternates } from "@/lib/seo/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("ContentPages.blog");
  return { title: t("title"), description: t("description"), alternates: getLocalizedAlternates(locale, "/blog") };
}
export default async function BlogPage() {
  const locale = await getLocale();
  const [t, listing] = await Promise.all([
    getTranslations("ContentPages.blog"), getBlogPosts({ locale, page: 1 }),
  ]);
  const featured = listing.items.find((article) => article.isFeatured);
  const heroId = featured?.id ?? null;
  const hasMore = listing.pagination.current_page < listing.pagination.last_page;
  return (
    <Container className="main-content-spacing">
      <Breadcrumbs label={t("breadcrumbs.label")} items={[
        { label: t("breadcrumbs.home"), href: "/" }, { label: t("breadcrumbs.blog") },
      ]} />
      <PageIntro title={t("title")} description={t("description")} className="mt-5 mb-8 md:mb-12 text-start"
        descriptionClassName="mt-6 sm:mt-7 md:mt-8" />
      {listing.items.length === 0 ? (
        <EmptyState role="status" title={t("emptyTitle")} description={t("empty")} />
      ) : (
        <>
          {featured ? <FeaturedArticle article={featured} featuredLabel={t("featured")} locale={locale} /> : null}
          {hasMore ? <BlogListing key={locale} initialListing={listing} heroId={heroId} locale={locale} /> : (
            <BlogGrid articles={regularBlogArticles([listing], heroId)} locale={locale} label={t("allArticles")} />
          )}
        </>
      )}
    </Container>
  );
}
