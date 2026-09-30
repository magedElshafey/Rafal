import type { Locale } from "next-intl";
import type { BlogPage } from "@/features/blog/types";
import { getNextPageParam } from "@/lib/api/pagination";

export const BLOG_PAGE_SIZE = 15;

export const blogQuery = {
  key: (locale: Locale) => ["blog", "posts", { locale, perPage: BLOG_PAGE_SIZE }] as const,
  getNextPageParam: (page: BlogPage) => getNextPageParam(page.pagination),
};
