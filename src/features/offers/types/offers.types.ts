import type { MockListingProductSource } from "@/features/products/api/mock-product-listing";

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
  source: MockListingProductSource;
};

export type OfferOption = {
  label: string;
  value: OfferType;
};
