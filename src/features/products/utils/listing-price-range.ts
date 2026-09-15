import type { ProductListingFilters } from "@/features/products/types/product-listing.types";

export function isListingPriceRangeValid(
  filters: Pick<ProductListingFilters, "maxPrice" | "minPrice">,
): boolean {
  return (
    filters.minPrice === undefined ||
    filters.maxPrice === undefined ||
    filters.minPrice <= filters.maxPrice
  );
}
