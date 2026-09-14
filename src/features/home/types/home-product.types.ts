import type { Locale } from "next-intl";

export type HomeProductCategory = "accessories" | "jewelry" | "perfumes";

export type HomeProductBadge = "discount" | "new" | "personalization";

export type HomeProduct = {
  badge?: HomeProductBadge;
  category: HomeProductCategory;
  id: number;
  imageUrl: string;
  name: Record<Locale, string>;
  originalPrice?: number;
  price: number;
  rating: number;
  slug: string;
};
