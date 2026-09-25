import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { getCategoryBySlug } from "@/features/categories/api/get-category-by-slug";
import { resolveCurrentLocation } from "@/features/location/server/resolve-current-location";
import { getCatalogueProducts } from "@/features/products/api/get-catalogue-products";
import { CatalogueProductListing } from "@/features/products/components/listing/catalogue-product-listing";
import {
  parseCatalogueListingSearchParams,
  toUrlSearchParams,
} from "@/features/products/utils/catalogue-listing-search-params";
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

  const city = await resolveCurrentLocation(locale);
  const { filters: parsedFilters, sort } =
    parseCatalogueListingSearchParams(toUrlSearchParams(rawSearchParams));
  const selectedChild = category.children.find(
    (child) => child.slug === parsedFilters.subcategory,
  );
  const filters = {
    ...parsedFilters,
    subcategory: selectedChild?.slug,
  };
  const priceRangeIsValid = isListingPriceRangeValid(filters);
  const listing = priceRangeIsValid
    ? await getCatalogueProducts({
        categoryId: selectedChild?.id ?? category.id,
        cityId: city?.id ?? null,
        filters,
        page: 1,
        sort,
      })
    : null;

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
        {listing ? (
          <p className="mt-1 type-body-sm text-muted-foreground">
            {t("resultCount", { count: listing.pagination.total })}
          </p>
        ) : null}
      </div>
      <div className="mt-6">
        <CatalogueProductListing
          categoryId={selectedChild?.id ?? category.id}
          cityId={city?.id ?? null}
          copy={{
            badges: {
              discount: t("badges.discount"),
              new: t("badges.new"),
              personalization: t("badges.personalization"),
            },
            closeFilters: t("closeFilters"),
            emptyDescription: t("emptyDescription"),
            emptyTitle: t("emptyTitle"),
            filterButton: t("filterButton"),
            loading: t("loading"),
            loadingMore: t("loadingMore"),
            loadMore: t("loadMore"),
            nextPageError: t("nextPageError"),
            filters: {
              additional: t("filters.additional"),
              all: t("filters.all"),
              invalidPriceRange: t("filters.invalidPriceRange"),
              maxPrice: t("filters.maxPrice"),
              minPrice: t("filters.minPrice"),
              newArrival: t("filters.newArrival"),
              onDiscount: t("filters.onDiscount"),
              personalizable: t("filters.personalizable"),
              priceRange: t("filters.priceRange"),
              subcategories: t("filters.subcategories"),
            },
            rating: t.raw("rating") as string,
            retry: t("retry"),
            reviews: t.raw("reviews") as string,
            sortLabel: t("sort.label"),
            sortOptions: {
              relevance: t("sort.relevance"),
              newest: t("sort.newest"),
              price_asc: t("sort.priceAsc"),
              price_desc: t("sort.priceDesc"),
            },
            unavailable: t("unavailable"),
          }}
          filters={filters}
          listing={listing}
          locale={locale}
          sort={sort}
          subcategoryOptions={category.children.map((child) => ({
            label: child.name,
            value: child.slug,
          }))}
        />
      </div>
    </Container>
  );
}
