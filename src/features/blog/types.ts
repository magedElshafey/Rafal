import type { PaginationMeta } from "@/lib/api/pagination";

export type BlogSummary = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  category: { id: number; name: string; slug: string } | null;
  authorName: string | null;
  isFeatured: boolean;
  readingTimeMinutes: number;
  publishedAt: string;
};
export type BlogPage = {
  items: BlogSummary[];
  pagination: PaginationMeta;
};

export type BlogPost = BlogSummary & {
  body: string;
  related: BlogSummary[];
};
