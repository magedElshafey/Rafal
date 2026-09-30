import type { Locale } from "next-intl";
import type { BlogSummary } from "@/features/blog/types";
import { BlogCard } from "@/features/blog/components/BlogCard";

export function BlogGrid({ articles, locale, label }: { articles: readonly BlogSummary[]; locale: Locale; label: string }) {
  if (articles.length === 0) return null;
  return (
    <section aria-label={label} className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => <BlogCard key={article.id} article={article} locale={locale} />)}
    </section>
  );
}
