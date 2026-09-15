import {
  dehydrate,
  HydrationBoundary,
  type InfiniteData,
  QueryClient,
} from "@tanstack/react-query";
import { getLocale, getTranslations } from "next-intl/server";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { getOffersProducts } from "@/features/offers/api/get-offers-products";
import { offersProductsQuery } from "@/features/offers/api/offers-products-query";
import {
  OffersProductListing,
  type OffersProductListingCopy,
} from "@/features/offers/components/offers-product-listing";
import { OffersPromoBanner } from "@/features/offers/components/offers-promo-banner";
import type { OfferOption } from "@/features/offers/types/offers.types";
import { parseOfferType } from "@/features/offers/utils/offers-search-params";
import type { PaginatedListingProducts } from "@/features/products/types/product-listing.types";

type OffersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const [rawSearchParams, locale, t, tListing] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations("Common.offersPage"),
    getTranslations("Common.productListing"),
  ]);
  const urlSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(rawSearchParams)) {
    if (typeof value === "string") urlSearchParams.set(key, value);
    else value?.forEach((item) => urlSearchParams.append(key, item));
  }
  const offer = parseOfferType(urlSearchParams);
  const firstPage = await getOffersProducts({ offer, page: 1 });
  const queryClient = new QueryClient();
  queryClient.setQueryData<InfiniteData<PaginatedListingProducts>>(
    offersProductsQuery.key(locale, offer),
    { pages: [firstPage], pageParams: [1] },
  );

  const offerOptions: OfferOption[] = [
    { value: "all", label: t("filters.all") },
    { value: "new", label: t("filters.new") },
    {
      value: "personalized-discounts",
      label: t("filters.personalizedDiscounts"),
    },
    { value: "weekend", label: t("filters.weekend") },
    { value: "up-to-30", label: t("filters.upTo30") },
  ];
  const listingCopy: OffersProductListingCopy = {
    badges: {
      discount: tListing("badges.discount"),
      new: tListing("badges.new"),
      personalization: tListing("badges.personalization"),
    },
    emptyDescription: t("emptyDescription"),
    emptyTitle: t("emptyTitle"),
    errorDescription: t("errorDescription"),
    errorTitle: t("errorTitle"),
    filterLabel: t("filterLabel"),
    loading: tListing("loading"),
    loadMore: tListing("loadMore"),
    loadingMore: tListing("loadingMore"),
    nextPageError: tListing("nextPageError"),
    rating: tListing.raw("rating") as string,
    retry: tListing("retry"),
    unavailable: tListing("unavailable"),
  };

  return (
    <div className="main-content-spacing pb-12">
      <Container>
        <Breadcrumbs
          label={t("breadcrumbs.label")}
          items={[
            { label: t("breadcrumbs.home"), href: "/" },
            { label: t("breadcrumbs.offers") },
          ]}
        />
        <h1 className="mt-5 text-h1 font-bold text-foreground">
          {t("title")}
        </h1>
      </Container>

      <OffersPromoBanner alt={t("bannerAlt")} />

      <Container className="mt-8">
        <HydrationBoundary state={dehydrate(queryClient)}>
          <OffersProductListing
            copy={listingCopy}
            locale={locale}
            offerOptions={offerOptions}
          />
        </HydrationBoundary>
      </Container>
    </div>
  );
}
