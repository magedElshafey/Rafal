import { AppImage } from "@/components/ui/app-image";
import { Link } from "@/i18n/navigation";

import type { LocalizedBlogArticle } from "../types";
import { ArticleMeta } from "./ArticleMeta";
import { Badge } from "@/components/ui/badge";

type FeaturedArticleProps = {
  article: LocalizedBlogArticle;
  featuredLabel: string;
  locale: string;
};

export function FeaturedArticle({
  article,
  featuredLabel,
  locale,
}: FeaturedArticleProps) {
  return (
    <article className="group relative grid overflow-hidden rounded-lg border border-gray-200 bg-gray-0 md:grid-cols-2">
      <div className="flex flex-col justify-center p-6 md:p-8 lg:p-10">
        <Badge>{featuredLabel}</Badge>

        <h2 className="mt-4 text-h2 font-bold text-gray-1000">
          <Link
            href={`/blog/${article.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
          >
            {article.title}
          </Link>
        </h2>
        <p className="mt-3 type-body-lg text-gray-500">{article.excerpt}</p>
        <div className="mt-4">
          <ArticleMeta date={article.publishedAt} locale={locale} />
        </div>
      </div>
      <AppImage
        src={article.image.src}
        alt={article.image.alt}
        aspectRatio="16 / 9"
        sizes="(max-width: 768px) 100vw, 50vw"
        preload
        frameClassName="h-full min-h-56 rounded-none"
      />
    </article>
  );
}
