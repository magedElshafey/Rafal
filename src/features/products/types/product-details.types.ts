import type { Money } from "@/types/money.types";

export type ProductCategoryReference = {
  id: string;
  name: string;
  slug: string;
};

// Arbitrary backend HTML is not part of this projection until the Laravel/CMS
// rich-text trust and sanitization contract is approved.
export type ProductDescription = {
  format: "plain-text";
  paragraphs: readonly string[];
};

export type ProductImage = {
  id: string;
  src: string;
  alt: string;
};

export type ProductOptionKey = "color" | "material" | "size";

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
  id: string;
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

export type ProductPersonalizationConfig =
  | { enabled: false }
  | {
      enabled: true;
      maxLength: number;
      allowedLanguages: readonly PersonalizationLanguage[];
      characterPolicy: PersonalizationCharacterPolicy;
      additionalFee: Money | null;
    };

// ProductDetails is a localized product projection. It intentionally excludes
// selected UI state, Cart state, reviews, and location-resolved availability.
// Its default variant is explicit; the Laravel contract must identify one too.
export type ProductDetails = {
  id: string;
  slug: string;
  name: string;
  description: ProductDescription;
  category: ProductCategoryReference;
  images: readonly ProductImage[];
  options: readonly ProductOption[];
  variants: readonly ProductVariant[];
  defaultVariantId: string;
  ratingSummary: ProductRatingSummary;
  personalization: ProductPersonalizationConfig;
};
