"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { Locale } from "next-intl";

import { ErrorState } from "@/components/ui/error-state";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { categoriesQuery } from "@/features/categories/api/categories-query";
import { getCategoriesPageClient } from "@/features/categories/api/get-categories.client";
import { CategoryCard } from "@/features/categories/components/category-card";

type CategoriesListCopy = {
  initialErrorDescription: string;
  initialErrorTitle: string;
  loadMore: string;
  loadingMore: string;
  nextPageError: string;
  retry: string;
};

type CategoriesListProps = {
  copy: CategoriesListCopy;
  locale: Locale;
};

export function CategoriesList({ copy, locale }: CategoriesListProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isFetchNextPageError,
    refetch,
  } = useInfiniteQuery({
    queryKey: categoriesQuery.key(locale),
    queryFn: ({ pageParam, signal }) =>
      getCategoriesPageClient({ locale, page: pageParam, signal }),
    initialPageParam: 1,
    getNextPageParam: categoriesQuery.getNextPageParam,
    retry: false,
    staleTime: 30_000,
  });

  if (isError && !data) {
    return (
      <ErrorState
        title={copy.initialErrorTitle}
        description={copy.initialErrorDescription}
        action={
          <LoadMoreButton
            hasNextPage
            isLoading={false}
            label={copy.retry}
            onClick={() => void refetch()}
          />
        }
      />
    );
  }

  const categories = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>

      {isFetchNextPageError ? (
        <p className="mt-6 text-center type-body text-destructive" role="alert">
          {copy.nextPageError}
        </p>
      ) : null}

      <div className="mt-6 flex justify-center">
        <LoadMoreButton
          hasNextPage={hasNextPage === true}
          isLoading={isFetchingNextPage}
          label={isFetchNextPageError ? copy.retry : copy.loadMore}
          loadingLabel={copy.loadingMore}
          onClick={() => void fetchNextPage()}
        />
      </div>
    </>
  );
}
