import type { Locale } from "next-intl";

export type StorefrontProductCategory =
  | "accessories"
  | "jewelry"
  | "perfumes";

export type StorefrontProductBadge =
  | "discount"
  | "new"
  | "personalization";

export type StorefrontProduct = {
  badge?: StorefrontProductBadge;
  category: StorefrontProductCategory;
  id: string;
  imageUrl: string;
  name: Record<Locale, string>;
  originalPrice?: number;
  price: number;
  rating: number;
  slug: string;
};
