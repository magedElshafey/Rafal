import type { PaginationMeta } from "@/lib/api/pagination";

export type BlogSummaryDto = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  cover_url: string | null;
  category: { id: number; name: string; slug: string } | null;
  author_name: string | null;
  is_featured: boolean;
  reading_time_minutes: number;
  published_at: string;
};
export type BlogListDto = {
  success: boolean;
  message: string;
  data: BlogSummaryDto[];
  meta: PaginationMeta;
};

export type BlogPostDto = BlogSummaryDto & {
  body: string;
  related: BlogSummaryDto[];
};
export type BlogPostResponseDto = {
  success: boolean;
  message: string;
  data: BlogPostDto;
};
