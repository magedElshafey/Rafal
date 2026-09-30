import type { Locale } from "next-intl";
import { createClientApi } from "@/lib/api/client-api";
import { parseBlogListDto } from "@/features/blog/api/parse-blog-dto";
import { mapBlogList } from "@/features/blog/api/blog-mappers";
import { BLOG_PAGE_SIZE } from "@/features/blog/api/blog-query";

export async function getBlogPostsClient({ locale, page, signal }: { locale: Locale; page: number; signal?: AbortSignal }) {
  const response = await createClientApi(locale).request<unknown>({
    path: "/blog", query: { page, per_page: BLOG_PAGE_SIZE }, signal,
  });
  return mapBlogList(parseBlogListDto(response));
}
