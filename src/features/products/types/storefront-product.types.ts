import type { ListingProduct } from "@/features/products/types/product-listing.types";

export type StorefrontProductCategory =
  | "accessories"
  | "jewelry"
  | "perfumes";

export type StorefrontProductBadge =
  | "discount"
  | "new"
  | "personalization";

export type StorefrontProduct = Omit<ListingProduct, "name"> & {
  category: StorefrontProductCategory;
  name: string;
};
