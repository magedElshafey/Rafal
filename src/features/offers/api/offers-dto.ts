import type { ProductDto, ProductListMetaDto } from "@/features/products/api/product-dto";

export type CouponDto = {
  code: string;
  name: string;
  description: string;
  type: "percent" | "fixed";
  value: number;
  max_discount_amount: number | null;
  min_order_amount: number | null;
  ends_at: string | null;
  estimated_discount: string;
};

export type OffersDto = {
  success: true;
  message: string;
  data: {
    coupons: CouponDto[];
    discounted_products: { data: readonly ProductDto[]; meta: ProductListMetaDto };
  };
};
