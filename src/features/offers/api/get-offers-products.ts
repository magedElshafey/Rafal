import type { Locale } from "next-intl";

import { getOffersProductRecords } from "@/features/offers/api/offers-products-fixture";
import type { OfferType } from "@/features/offers/types/offers.types";
import { createMockProductListing } from "@/features/products/api/mock-product-listing";
import type { PaginatedListingProducts } from "@/features/products/types/product-listing.types";
import { defaultListingSort } from "@/features/products/utils/listing-search-params";

export type OffersProductsRequest = {
  locale: Locale;
  offer: OfferType;
  page: number;
};

export async function getOffersProducts(
  request: OffersProductsRequest,
  signal?: AbortSignal,
): Promise<PaginatedListingProducts> {
  signal?.throwIfAborted();
  const { locale, offer, page } = request;
  const products = getOffersProductRecords(locale)
    .filter((record) => {
      if (offer === "all") return true;
      return record.offers.includes(offer);
    })
    .map((record) => record.source);

  return Promise.resolve(
    createMockProductListing({
      filters: { inStock: false, personalizable: false },
      page,
      products,
      sort: defaultListingSort,
    }),
  );
}
