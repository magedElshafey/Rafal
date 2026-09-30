"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { useTranslations, type Locale } from "next-intl";

import { LoadMoreButton } from "@/components/ui/load-more-button";
import { getOffersProductsClient } from "@/features/offers/api/get-offers-products.client";
import { offersProductsQuery } from "@/features/offers/api/offers-products-query";
import { ProductGrid } from "@/features/products/components/listing/product-grid";
import type { PaginatedListingProducts } from "@/features/products/types/product-listing.types";

export function OffersProductListing({ listing, locale, cityId, accountId }: {
  listing: PaginatedListingProducts;
  locale: Locale;
  cityId: number | null;
  accountId: string | null;
}) {
  const t = useTranslations("Common.offersPage");
  const productsT = useTranslations("Common.productListing");
  const loadingNext = useRef(false);
  const query = useInfiniteQuery({
    queryKey: offersProductsQuery.key(accountId, locale, cityId),
    queryFn: ({ pageParam, signal }) =>
      getOffersProductsClient({ locale, cityId, page: pageParam, signal }),
    initialData: { pages: [listing], pageParams: [1] },
    initialPageParam: 1,
    getNextPageParam: offersProductsQuery.getNextPageParam,
    // Match Catalogue: SSR supplies initial reads; only explicit Load More
    // fetches additional pages. Wishlist success patches these cached pages.
    staleTime: Infinity,
    retry: false,
  });
  const products = useMemo(() => {
    const seen = new Set<string>();
    return query.data.pages.flatMap((page) => page.items).filter((product) => {
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    });
  }, [query.data.pages]);

  async function loadMore() {
    if (loadingNext.current || query.isFetching || !query.hasNextPage) return;
    loadingNext.current = true;
    try {
      await query.fetchNextPage({ cancelRefetch: false });
    } finally {
      loadingNext.current = false;
    }
  }

  // Initial empty sections remain owned by Slice A; later empty pages do not
  // discard already loaded products or override authoritative pagination meta.
  if (listing.items.length === 0) return null;
  return (
    <section aria-labelledby="offers-products-title" className="space-y-5">
      <h2 id="offers-products-title" className="text-h3 font-medium text-foreground">{t("productsTitle")}</h2>
      <ProductGrid
        products={products}
        locale={locale}
        wishlistAccountId={accountId}
        badgeLabels={{
          discount: productsT("badges.discount"),
          new: productsT("badges.new"),
          personalization: productsT("badges.personalization"),
        }}
        ratingLabel={(value) => productsT("rating", { value })}
        reviewsLabel={(count) => productsT("reviews", { count })}
        unavailableLabel={productsT("unavailable")}
      />
      {query.hasNextPage ? (
        <div className="space-y-3 pt-5 text-center">
          {query.isFetchNextPageError ? (
            <p role="alert" className="type-body text-destructive">{productsT("nextPageError")}</p>
          ) : null}
          <LoadMoreButton
            hasNextPage
            disabled={query.isFetching}
            isLoading={query.isFetchingNextPage}
            label={productsT(query.isFetchNextPageError ? "retry" : "loadMore")}
            loadingLabel={productsT("loadingMore")}
            onClick={() => void loadMore()}
          />
        </div>
      ) : null}
    </section>
  );
}
