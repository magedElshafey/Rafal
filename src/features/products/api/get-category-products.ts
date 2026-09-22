import { getCategoryProductSources } from "@/features/products/api/category-products-fixture";
import {
  createMockListingFacets,
  createMockProductListing,
  mapMockListingProducts,
} from "@/features/products/api/mock-product-listing";
import type {
  CategoryProductsRequest,
  ListingSubcategoryOption,
  PaginatedListingProducts,
  ProductListingFacets,
} from "@/features/products/types/product-listing.types";

type SubcategoryDescriptor = Pick<
  ListingSubcategoryOption,
  "label" | "value"
>;

// Temporary mock facet source. A future products response can replace this
// helper without changing ListingFilters or its option contract.
export function getCategoryListingFacets(
  locale: CategoryProductsRequest["locale"],
  subcategories: readonly SubcategoryDescriptor[],
): ProductListingFacets {
  return createMockListingFacets(
    mapMockListingProducts(getCategoryProductSources(locale)),
    subcategories,
  );
}

export async function getCategoryProducts(
  request: CategoryProductsRequest,
  signal?: AbortSignal,
): Promise<PaginatedListingProducts> {
  signal?.throwIfAborted();
  const { filters, locale, page, sort } = request;

  return Promise.resolve(
    createMockProductListing({
      filters,
      page,
      products: getCategoryProductSources(locale),
      sort,
    }),
  );
}
