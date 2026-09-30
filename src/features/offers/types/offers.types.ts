import type { PaginatedListingProducts } from "@/features/products/types/product-listing.types";

export type Coupon = {
  code: string;
  name: string;
  description: string;
  type: "percent" | "fixed";
  value: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  endsAt: string | null;
};

export type Offers = {
  coupons: Coupon[];
  discountedProducts: PaginatedListingProducts;
};
