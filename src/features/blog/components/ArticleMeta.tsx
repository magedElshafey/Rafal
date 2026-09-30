import type { Locale } from "next-intl";

import { formatBlogDate } from "@/features/blog/utils/format-blog-date";

type ArticleMetaProps = {
  author?: string | null;
  date: string;
  locale: Locale;
  readingTime?: string;
};

export function ArticleMeta({
  author,
  date,
  locale,
  readingTime,
}: ArticleMetaProps) {
  const formattedDate = formatBlogDate(locale, date);
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 type-caption text-gray-600">
      <time dateTime={date}>{formattedDate}</time>
      {author ? (
        <>
          <span aria-hidden="true">•</span>
          <span>{author}</span>
        </>
      ) : null}
      {readingTime ? (
        <>
          <span aria-hidden="true">•</span>
          <span>{readingTime}</span>
        </>
      ) : null}
    </p>
  );
}
