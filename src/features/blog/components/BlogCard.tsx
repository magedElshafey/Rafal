import { AppImage } from "@/components/ui/app-image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import type { LocalizedBlogArticle } from "../types";
import { ArticleMeta } from "./ArticleMeta";

type BlogCardProps = {
  article: LocalizedBlogArticle;
  locale: string;
  variant?: "default" | "compact";
};

export function BlogCard({
  article,
  locale,
  variant = "default",
}: BlogCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-lg border border-gray-200 bg-background">
      <AppImage
        src={article.image.src}
        alt={article.image.alt}
        aspectRatio={variant === "compact" ? "16 / 7" : "16 / 9"}
        sizes={
          variant === "compact"
            ? "(max-width: 768px) 100vw, 30vw"
            : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        }
        frameClassName="rounded-none"
      />
      <div className={cn("p-4", variant === "compact" && "px-4 py-3")}>
        <p className="text-xs font-medium text-success">{article.category}</p>
        <h2
          className={cn(
            "mt-1 font-bold text-foreground",
            variant === "compact" ? "text-base" : "text-lg",
          )}
        >
          <Link
            href={`/blog/${article.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
          >
            {article.title}
          </Link>
        </h2>
        {variant === "default" ? (
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">
            {article.excerpt}
          </p>
        ) : null}
        {variant === "default" ? (
          <div className="mt-2">
            <ArticleMeta date={article.publishedAt} locale={locale} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
