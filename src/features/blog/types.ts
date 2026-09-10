import type { Locale } from "next-intl";

export type LocalizedText = Record<Locale, string>;

export type BlogArticle = {
  id: string;
  slug: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  content: Record<Locale, readonly string[]>;
  category: LocalizedText;
  publishedAt: string;
  readingTime: number;
  image: {
    src: string | null;
    alt: LocalizedText;
  };
  featured?: boolean;
};

export type LocalizedBlogArticle = Omit<
  BlogArticle,
  "category" | "content" | "excerpt" | "image" | "title"
> & {
  category: string;
  content: readonly string[];
  excerpt: string;
  image: { src: string | null; alt: string };
  title: string;
};
