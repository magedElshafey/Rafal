import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { resolveCurrentLocation } from "@/features/location/server/resolve-current-location";
import { getCatalogueProducts } from "@/features/products/api/get-catalogue-products";
import { CatalogueProductListing } from "@/features/products/components/listing/catalogue-product-listing";
import {
  parseCatalogueListingSearchParams,
  toUrlSearchParams,
} from "@/features/products/utils/catalogue-listing-search-params";
import { isListingPriceRangeValid } from "@/features/products/utils/listing-price-range";
import { getLocalizedAlternates } from "@/lib/seo/alternates";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({
    locale,
    namespace: "Metadata.ProductsPage",
  });
  return {
    title: t("title"),
    alternates: getLocalizedAlternates(locale, "/products"),
  };
}
export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const [rawSearchParams, locale, t, tSearch] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations("Common.productListing"),
    getTranslations("Common.searchResults"),
  ]);
  const [city, user] = await Promise.all([
    resolveCurrentLocation(locale),
    getCurrentUser(),
  ]);
  const { filters: parsedFilters, search, sort } =
    parseCatalogueListingSearchParams(toUrlSearchParams(rawSearchParams));
  const filters = { ...parsedFilters, subcategory: undefined };
  const priceRangeIsValid = isListingPriceRangeValid(filters);
  const listing = priceRangeIsValid
    ? await getCatalogueProducts({
        cityId: city?.id ?? null,
        filters,
        locale,
        page: 1,
        search,
        sort,
      })
    : null;

  return (
    <Container className="main-content-spacing pb-12">
      <Breadcrumbs
        label={t("breadcrumbs.label")}
        items={[
          { label: t("breadcrumbs.home"), href: "/" },
          { label: t("breadcrumbs.products") },
        ]}
      />
      <div className="mt-5">
        <h1 className="text-h1 font-bold text-foreground">
          {search ? tSearch("title") : t("title")}
        </h1>
        {listing ? (
          <p className="mt-1 type-body-sm text-muted-foreground">
            {search
              ? tSearch("summary", {
                  count: listing.pagination.total,
                  query: search,
                })
              : t("resultCount", { count: listing.pagination.total })}
          </p>
        ) : null}
      </div>
      <div className="mt-6">
        <CatalogueProductListing
          accountId={user?.id ?? null}
          cityId={city?.id ?? null}
          copy={{
            badges: {
              discount: t("badges.discount"),
              new: t("badges.new"),
              personalization: t("badges.personalization"),
            },
            closeFilters: t("closeFilters"),
            emptyDescription: search
              ? tSearch("noResultsDescription", { query: search })
              : t("emptyDescription"),
            emptyTitle: search
              ? tSearch("noResultsTitle")
              : t("emptyTitle"),
            filterButton: t("filterButton"),
            loading: t("loading"),
            loadingMore: t("loadingMore"),
            loadMore: t("loadMore"),
            nextPageError: t("nextPageError"),
            filters: {
              additional: t("filters.additional"),
              invalidPriceRange: t("filters.invalidPriceRange"),
              maxPrice: t("filters.maxPrice"),
              minPrice: t("filters.minPrice"),
              newArrival: t("filters.newArrival"),
              onDiscount: t("filters.onDiscount"),
              personalizable: t("filters.personalizable"),
              priceRange: t("filters.priceRange"),
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
          search={search}
          sort={sort}
        />
      </div>
    </Container>
  );
}
