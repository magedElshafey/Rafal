import type { BlogListDto, BlogPostResponseDto, BlogSummaryDto } from "@/features/blog/api/blog-dto";
import type { BlogPage, BlogPost, BlogSummary } from "@/features/blog/types";
import { ApiError } from "@/lib/api/api-error";

export function mapBlogSummary(dto: BlogSummaryDto): BlogSummary {
  return {
    id: dto.id, slug: dto.slug, title: dto.title, excerpt: dto.excerpt,
    coverUrl: dto.cover_url, category: dto.category, authorName: dto.author_name,
    isFeatured: dto.is_featured, readingTimeMinutes: dto.reading_time_minutes,
    publishedAt: dto.published_at,
  };
}
export function mapBlogList(dto: BlogListDto): BlogPage {
  if (!dto.success) throw new ApiError({ status: 503, code: "blog-unavailable", message: "Blog is unavailable." });
  return { items: dto.data.map(mapBlogSummary), pagination: dto.meta };
}

export function regularBlogArticles(pages: readonly BlogPage[], heroId: number | null): BlogSummary[] {
  const seen = new Set<number>(heroId === null ? [] : [heroId]);
  return pages.flatMap((page) => page.items).filter((article) => {
    if (seen.has(article.id)) return false;
    seen.add(article.id);
    return true;
  });
}

export function mapBlogPost(dto: BlogPostResponseDto): BlogPost {
  if (!dto.success) throw new ApiError({ status: 503, code: "blog-unavailable", message: "Blog is unavailable." });
  return {
    ...mapBlogSummary(dto.data),
    body: dto.data.body,
    related: dto.data.related.map(mapBlogSummary),
  };
}
