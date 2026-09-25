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

export const catalogueListingSortValues = [
  "relevance",
  "newest",
  "price_asc",
  "price_desc",
] as const;
export type CatalogueListingSort = (typeof catalogueListingSortValues)[number];

export type CatalogueProductFilters = {
  maxPrice?: number;
  minPrice?: number;
  newArrival: boolean;
  onDiscount: boolean;
  personalizable: boolean;
  subcategory?: string;
};

export type CatalogueSubcategoryOption = {
  label: string;
  value: string;
};

export type ListingProduct = {
  badge?: "discount" | "new" | "personalization";
  /** Request-localized display labels from Laravel. Never inspect for logic. */
  badges?: readonly string[];
  categoryId: number;
  createdOrder?: number;
  id: string;
  imageUrl: string | null;
  inStock: boolean;
  name: string;
  originalPrice?: number;
  personalizable: boolean;
  price: number;
  ratingAverage: number;
  reviewsCount: number;
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

export type CatalogueProductsRequest = {
  categoryId?: number;
  cityId: number | null;
  filters: CatalogueProductFilters;
  page: number;
  sort: CatalogueListingSort;
};
