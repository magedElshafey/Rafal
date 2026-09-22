import type { Locale } from "next-intl";

import type { PaginationMeta } from "@/lib/api/pagination";

export const listingSortValues = [
  "best-selling",
  "price-asc",
  "price-desc",
  "newest",
] as const;
export type ListingSort = (typeof listingSortValues)[number];

export type ProductListingFilters = {
  inStock: boolean;
  maxPrice?: number;
  minPrice?: number;
  personalizable: boolean;
  subcategory?: string;
};

export type ListingProduct = {
  badge?: "discount" | "new" | "personalization";
  /** Request-localized display labels from Laravel. Never inspect for logic. */
  badges?: readonly string[];
  createdOrder?: number;
  id: string;
  imageUrl: string;
  inStock: boolean;
  name: string;
  originalPrice?: number;
  personalizable: boolean;
  price: number;
  rating: number | null;
  salesCount: number;
  slug: string;
  subcategory: string;
};

export type ListingSubcategoryOption = {
  count: number;
  label: string;
  value: string;
};

export type ProductListingFacets = {
  subcategoryOptions: ListingSubcategoryOption[];
  total: number;
};

export type PaginatedListingProducts = {
  items: ListingProduct[];
  pagination: PaginationMeta;
};

export type CategoryProductsRequest = {
  category: string;
  filters: ProductListingFilters;
  locale: Locale;
  page: number;
  sort: ListingSort;
};
