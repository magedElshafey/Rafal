import {
  dehydrate,
  HydrationBoundary,
  type InfiniteData,
  QueryClient,
} from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { getCategoryBySlug } from "@/features/categories/api/get-category-by-slug";
import {
  getCategoryListingFacets,
  getCategoryProducts,
} from "@/features/products/api/get-category-products";
import { productListingQuery } from "@/features/products/api/product-listing-query";
import { CategoryProductListing } from "@/features/products/components/listing/category-product-listing";
import type { PaginatedListingProducts } from "@/features/products/types/product-listing.types";
import { parseListingSearchParams } from "@/features/products/utils/listing-search-params";
import { isListingPriceRangeValid } from "@/features/products/utils/listing-price-range";
import { ApiError } from "@/lib/api/api-error";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const [{ slug }, rawSearchParams, locale, t] = await Promise.all([
    params,
    searchParams,
    getLocale(),
    getTranslations("Common.productListing"),
  ]);
  let category;
  try {
    category = await getCategoryBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const urlSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(rawSearchParams)) {
    if (typeof value === "string") urlSearchParams.set(key, value);
    else value?.forEach((item) => urlSearchParams.append(key, item));
  }
  const { filters, sort } = parseListingSearchParams(urlSearchParams);
  const priceRangeIsValid = isListingPriceRangeValid(filters);
  const firstPage = priceRangeIsValid
    ? await getCategoryProducts({
        category: slug,
        filters,
        locale,
        page: 1,
        sort,
      })
    : undefined;
  const { subcategoryOptions, total: categoryTotal } =
    getCategoryListingFacets(
      locale,
      category.children.map((subcategory) => ({
        label: subcategory.name,
        value: subcategory.slug,
      })),
    );
  const queryClient = new QueryClient();
  if (firstPage) {
    queryClient.setQueryData<InfiniteData<PaginatedListingProducts>>(
      productListingQuery.key(locale, slug, filters, sort),
      { pages: [firstPage], pageParams: [1] },
    );
  }

  return (
    <Container className="main-content-spacing pb-12">
      <Breadcrumbs
        label={t("breadcrumbs.label")}
        items={[
          { label: t("breadcrumbs.home"), href: "/" },
          { label: t("breadcrumbs.categories"), href: "/categories" },
          { label: category.name },
        ]}
      />
      <div className="mt-5">
        <h1 className="text-h1 font-bold text-foreground">{category.name}</h1>
        <p className="mt-1 type-body-sm text-muted-foreground">
          {t("resultCount", {
            count: firstPage?.pagination.total ?? categoryTotal,
          })}
        </p>
      </div>
      <div className="mt-6">
        <HydrationBoundary state={dehydrate(queryClient)}>
          <CategoryProductListing
            category={slug}
            categoryTotal={categoryTotal}
            locale={locale}
            subcategoryOptions={subcategoryOptions}
            copy={{
              badges: {
                discount: t("badges.discount"),
                new: t("badges.new"),
                personalization: t("badges.personalization"),
              },
              closeFilters: t("closeFilters"),
              emptyDescription: t("emptyDescription"),
              emptyTitle: t("emptyTitle"),
              initialErrorDescription: t("initialErrorDescription"),
              initialErrorTitle: t("initialErrorTitle"),
              loading: t("loading"),
              filterButton: t("filterButton"),
              filters: {
                additional: t("filters.additional"),
                all: t("filters.all"),
                available: t("filters.available"),
                invalidPriceRange: t("filters.invalidPriceRange"),
                maxPrice: t("filters.maxPrice"),
                minPrice: t("filters.minPrice"),
                personalizable: t("filters.personalizable"),
                priceRange: t("filters.priceRange"),
                subcategories: t("filters.subcategories"),
              },
              loadMore: t("loadMore"),
              loadingMore: t("loadingMore"),
              nextPageError: t("nextPageError"),
              rating: t.raw("rating") as string,
              reviews: t.raw("reviews") as string,
              retry: t("retry"),
              sortLabel: t("sort.label"),
              sortOptions: {
                "best-selling": t("sort.bestSelling"),
                "price-asc": t("sort.priceAsc"),
                "price-desc": t("sort.priceDesc"),
                newest: t("sort.newest"),
              },
              unavailable: t("unavailable"),
            }}
          />
        </HydrationBoundary>
      </div>
    </Container>
  );
}
