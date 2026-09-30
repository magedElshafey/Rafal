import "server-only";
import type { Locale } from "next-intl";
import { serverApi } from "@/lib/api/server-api";
import { parseBlogListDto } from "@/features/blog/api/parse-blog-dto";
import { mapBlogList } from "@/features/blog/api/blog-mappers";
import { BLOG_PAGE_SIZE } from "@/features/blog/api/blog-query";

export async function getBlogPosts({ locale, page }: { locale: Locale; page: number }) {
  const response = await serverApi.request<unknown>({
    path: "/blog", headers: { "Accept-Language": locale }, query: { page, per_page: BLOG_PAGE_SIZE },
  });
  return mapBlogList(parseBlogListDto(response));
}
