import type { Money } from "@/types/money.types";

export type ProductCategoryReference = {
  id: string;
  name: string;
  slug: string;
};

export type ProductDescription = {
  html: string;
};

export type ProductImage = {
  id: string;
  src: string;
  alt: string;
};

export type ProductOptionKey = string;

export type ProductOptionValue = {
  id: string;
  label: string;
  swatchHex?: `#${string}`;
};

export type ProductOption = {
  id: string;
  key: ProductOptionKey;
  name: string;
  values: readonly ProductOptionValue[];
};

export type ProductPromotion = {
  percentage: number | null;
  endsAt: string | null;
};

export type ProductVariantPricing = {
  current: Money;
  compareAt: Money | null;
  promotion: ProductPromotion | null;
};

export type ProductVariantOptionValue = {
  optionId: string;
  valueId: string;
};

export type ProductVariant = {
  id: string;
  sku: string;
  /** Physical stock projected from Laravel warehouse quantities. */
  inStock: boolean;
  optionValues: readonly ProductVariantOptionValue[];
  pricing: ProductVariantPricing;
  imageIds: readonly string[];
};

export type ProductRatingSummary = {
  average: number;
  count: number;
};

export type PersonalizationLanguage = "arabic" | "english";

export type PersonalizationCharacterPolicy = "letters-and-spaces";

export type ProductPersonalizationInput = {
  language: PersonalizationLanguage;
  text: string;
};

export type ProductPersonalizationConfig =
  | { enabled: false }
  | {
      enabled: true;
      maxLength: number;
      allowedLanguages: readonly PersonalizationLanguage[];
      characterPolicy: PersonalizationCharacterPolicy;
      additionalFee: Money | null;
    };

export type EnabledProductPersonalizationConfig = Extract<
  ProductPersonalizationConfig,
  { enabled: true }
>;

// ProductDetails is a request-localized product projection. It intentionally
// excludes selected UI state, Cart state, reviews, and location-resolved
// availability. Initial variant selection is presentation behavior and uses
// the first valid variant; it is not a backend/domain identity field.
export type ProductDetails = {
  id: string;
  slug: string;
  name: string;
  description: ProductDescription;
  category: ProductCategoryReference;
  images: readonly ProductImage[];
  options: readonly ProductOption[];
  variants: readonly ProductVariant[];
  ratingSummary: ProductRatingSummary | null;
  personalization: ProductPersonalizationConfig;
};
