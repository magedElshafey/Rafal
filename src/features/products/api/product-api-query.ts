import type { ProductApiSort } from "@/features/products/api/product-sort";

export type ProductListQueryInput = {
  categoryId?: number;
  cityId?: number | null;
  maxPrice?: number;
  minPrice?: number;
  newArrival?: boolean;
  onDiscount?: boolean;
  page?: number;
  perPage?: number;
  personalizable?: boolean;
  search?: string;
  sort?: ProductApiSort;
};

export function createProductListQuery({
  categoryId,
  cityId,
  maxPrice,
  minPrice,
  newArrival,
  onDiscount,
  page,
  perPage,
  personalizable,
  search,
  sort,
}: ProductListQueryInput) {
  return {
    category_id: categoryId,
    city_id: cityId,
    max_price: maxPrice,
    min_price: minPrice,
    new_arrival: newArrival ? 1 : undefined,
    on_discount: onDiscount ? 1 : undefined,
    page,
    per_page: perPage,
    personalizable: personalizable ? 1 : undefined,
    search: search?.trim() || undefined,
    sort,
  };
}
