import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
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
  const [rawSearchParams, locale, t] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations("Common.productListing"),
  ]);
  const city = await resolveCurrentLocation(locale);
  const { filters: parsedFilters, sort } =
    parseCatalogueListingSearchParams(toUrlSearchParams(rawSearchParams));
  const filters = { ...parsedFilters, subcategory: undefined };
  const priceRangeIsValid = isListingPriceRangeValid(filters);
  const listing = priceRangeIsValid
    ? await getCatalogueProducts({
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
          { label: t("breadcrumbs.products") },
        ]}
      />
      <div className="mt-5">
        <h1 className="text-h1 font-bold text-foreground">{t("title")}</h1>
        {listing ? (
          <p className="mt-1 type-body-sm text-muted-foreground">
            {t("resultCount", { count: listing.pagination.total })}
          </p>
        ) : null}
      </div>
      <div className="mt-6">
        <CatalogueProductListing
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
          sort={sort}
        />
      </div>
    </Container>
  );
}
