"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { useTranslations, type Locale } from "next-intl";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { BlogGrid } from "@/features/blog/components/blog-grid";
import { blogQuery } from "@/features/blog/api/blog-query";
import { getBlogPostsClient } from "@/features/blog/api/get-blog-posts.client";
import { regularBlogArticles } from "@/features/blog/api/blog-mappers";
import type { BlogPage } from "@/features/blog/types";

export function BlogListing({ initialListing, heroId, locale }: { initialListing: BlogPage; heroId: number | null; locale: Locale }) {
  const t = useTranslations("ContentPages.blog");
  const locked = useRef(false);
  const query = useInfiniteQuery({
    queryKey: blogQuery.key(locale),
    queryFn: ({ pageParam, signal }) => getBlogPostsClient({ locale, page: pageParam, signal }),
    initialData: { pages: [initialListing], pageParams: [1] },
    initialPageParam: 1,
    getNextPageParam: blogQuery.getNextPageParam,
    // Existing storefront convention: SSR initial read, explicit load-more only.
    staleTime: Infinity,
    // Discard inactive pages so the next navigation uses its fresh SSR data.
    gcTime: 0,
    retry: false, // The shared HTTP client owns GET retries.
  });
  async function loadMore() {
    if (locked.current || query.isFetching || !query.hasNextPage) return;
    locked.current = true;
    try {
      await query.fetchNextPage({ cancelRefetch: false });
    } finally {
      locked.current = false;
    }
  }
  return (
    <>
      <BlogGrid articles={regularBlogArticles(query.data.pages, heroId)} locale={locale} label={t("allArticles")} />
      {query.hasNextPage ? (
        <div className="mt-8 space-y-3 text-center">
          {query.isFetchNextPageError ? <p role="alert" className="type-body text-destructive">{t("nextPageError")}</p> : null}
          <LoadMoreButton hasNextPage disabled={query.isFetching} isLoading={query.isFetchingNextPage}
            label={t(query.isFetchNextPageError ? "retry" : "viewMore")} loadingLabel={t("loadingMore")}
            onClick={() => void loadMore()} />
        </div>
      ) : null}
    </>
  );
}
