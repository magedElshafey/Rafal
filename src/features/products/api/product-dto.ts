export type ProductAttributeValue = string | number | boolean;

export type ProductCategoryDto = {
  id: number;
  name: string;
  slug: string;
};

export type ProductWarehouseStockDto = {
  warehouse_id: number;
  /** Available physical stock; never a frontend purchase-limit value. */
  quantity: number;
};

export type ProductImageDto = {
  id: number;
  url: string;
};

export type ProductVariantDto = {
  id: number;
  sku: string;
  attributes: Readonly<Record<string, ProductAttributeValue>>;
  effective_price: string;
  effective_price_incl_vat: string;
  discounted_price: string | null;
  discounted_price_incl_vat: string | null;
  images: readonly ProductImageDto[];
  warehouse_stocks: readonly ProductWarehouseStockDto[];
};

export type ProductDto = {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  slug: string;
  base_price: string;
  discount_percentage: number | null;
  discount_end_at: string | null;
  badges: readonly string[];
  is_personalizable: boolean;
  personalization_max_length: number | null;
  personalization_fee: string | null;
  viewers_now: number;
  times_ordered: number;
  rating_average: number;
  reviews_count: number;
  images: readonly ProductImageDto[];
  category: ProductCategoryDto | null;
  variants: readonly ProductVariantDto[];
};

export type ProductListMetaDto = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type ProductListResponseDto = {
  success: boolean;
  message: string;
  data: readonly ProductDto[];
  meta: ProductListMetaDto;
};

export type ProductDetailsResponseDto = {
  success: boolean;
  message: string;
  data: ProductDto;
};
