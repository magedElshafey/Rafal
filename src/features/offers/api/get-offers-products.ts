import { offersProductsFixture } from "@/features/offers/api/offers-products-fixture";
import type { OfferType } from "@/features/offers/types/offers.types";
import { createMockProductListing } from "@/features/products/api/mock-product-listing";
import type { PaginatedListingProducts } from "@/features/products/types/product-listing.types";
import { defaultListingSort } from "@/features/products/utils/listing-search-params";

export type OffersProductsRequest = {
  offer: OfferType;
  page: number;
};

export async function getOffersProducts(
  request: OffersProductsRequest,
  signal?: AbortSignal,
): Promise<PaginatedListingProducts> {
  signal?.throwIfAborted();
  const { offer, page } = request;
  const products = offersProductsFixture
    .filter((record) => {
      if (offer === "all") return true;
      return record.offers.includes(offer);
    })
    .map((record) => record.product);

  return Promise.resolve(
    createMockProductListing({
      filters: { inStock: false, personalizable: false },
      page,
      products,
      sort: defaultListingSort,
    }),
  );
}
