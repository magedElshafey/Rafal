import "server-only";
import { cache } from "react";
import type { Locale } from "next-intl";
import { serverApi } from "@/lib/api/server-api";
import { ApiError } from "@/lib/api/api-error";
import { parseBlogPostDto } from "@/features/blog/api/parse-blog-dto";
import { mapBlogPost } from "@/features/blog/api/blog-mappers";
import type { BlogPost } from "@/features/blog/types";

type BlogPostReadResult =
  | { kind: "found"; post: BlogPost }
  | { kind: "not-found" };

// Request-scoped only: page and metadata share the same primitive arguments.
export const getBlogPostForRequest = cache(async (
  slug: string,
  locale: Locale,
): Promise<BlogPostReadResult> => {
  let response: unknown;
  try {
    response = await serverApi.request<unknown>({
      path: "/blog/" + encodeURIComponent(slug),
      headers: { "Accept-Language": locale },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { kind: "not-found" };
    throw error;
  }
  return { kind: "found", post: mapBlogPost(parseBlogPostDto(response)) };
});
