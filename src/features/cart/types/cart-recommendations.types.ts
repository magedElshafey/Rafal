import type { ListingProduct } from "@/features/products/types/product-listing.types";

export type CartRecommendations = {
  frequentlyOrderedWith: readonly ListingProduct[];
  related: readonly ListingProduct[];
};
