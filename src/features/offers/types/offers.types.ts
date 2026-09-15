import type { ListingProduct } from "@/features/products/types/product-listing.types";

export const offerValues = [
  "all",
  "new",
  "personalized-discounts",
  "weekend",
  "up-to-30",
] as const;

export type OfferType = (typeof offerValues)[number];
export type SpecificOfferType = Exclude<OfferType, "all">;

export type OfferProductRecord = {
  offers: readonly SpecificOfferType[];
  product: ListingProduct;
};

export type OfferOption = {
  label: string;
  value: OfferType;
};
