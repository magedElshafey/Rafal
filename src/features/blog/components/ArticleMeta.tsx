type ArticleMetaProps = {
  author?: string;
  date: string;
  locale: string;
  readingTime?: string;
};

export function ArticleMeta({ author, date, locale, readingTime }: ArticleMetaProps) {
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 type-caption text-gray-400">
      <time dateTime={date}>{formattedDate}</time>
      {author ? <><span aria-hidden="true">•</span><span>{author}</span></> : null}
      {readingTime ? <><span aria-hidden="true">•</span><span>{readingTime}</span></> : null}
    </p>
  );
}

