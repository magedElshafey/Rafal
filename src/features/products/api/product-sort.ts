import type { ListingSort } from "@/features/products/types/product-listing.types";

export type ProductApiSort = "newest" | "price_asc" | "price_desc" | "relevance";

const productApiSortByListingSort: Partial<
  Record<ListingSort, ProductApiSort>
> = {
  newest: "newest",
  "price-asc": "price_asc",
  "price-desc": "price_desc",
};

/**
 * Unsupported semantic sorts are omitted until Laravel confirms their keys.
 * In particular, `best-selling` is intentionally not guessed.
 */
export function toProductApiSort(sort: ListingSort): ProductApiSort | null {
  return productApiSortByListingSort[sort] ?? null;
}
