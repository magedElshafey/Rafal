export type CartAttributeDto = string | number | boolean;
export type CartImageDto = { id: number; url: string };
export type CartCityDto = { id: number; name: string };
export type CartGiftRecipientDto = {
  name: string;
  phone: string;
  city: CartCityDto;
  district: string;
  street_details: string;
};

export type CartCouponOptionDto = {
  code: string;
  name: string;
  description: string;
  type: string;
  value: number;
  max_discount_amount: number;
  min_order_amount: number | null;
  ends_at: string;
  estimated_discount: string;
};

export type CartLineDto = {
  id: number;
  quantity: number;
  personalization: unknown | null;
  stock: { status: "ok" | "low" | "out_of_stock"; available: number };
  product: {
    id: number;
    name: string;
    slug: string;
    image: CartImageDto | null;
    personalizable: boolean;
  };
  variant: {
    id: number;
    sku: string;
    attributes: Readonly<Record<string, CartAttributeDto>> | null;
  };
  unit_regular_price: string;
  unit_price: string;
  discount_active: boolean;
  personalization_fee: string;
  line_total: string;
};

export type CartTotalsLineDto = {
  unit_regular_price: string;
  unit_price: string;
  discount_per_unit: string;
  quantity: number;
  line_subtotal: string;
  personalization_fee: string;
  line_total: string;
  discount_active: boolean;
};

export type CartDataDto = {
  token: string | undefined;
  city: CartCityDto | undefined;
  items_count: number;
  lines_count: number;
  items: readonly CartLineDto[];
  totals: {
    lines: readonly CartTotalsLineDto[];
    items_count: number;
    lines_count: number;
    subtotal: string;
    product_discount_total: string;
    personalization_total: string;
    coupon_discount: string;
    gift_wrap_fee: string;
    shipping_fee: string | null;
    free_shipping: {
      enabled: boolean;
      threshold: string | null;
      qualifies: boolean;
      remaining: string | null;
    };
    total: string;
    vat: { rate: string; included_amount: string };
    currency: string;
  };
  coupon: {
    code: string;
    name: string;
    applied: boolean;
    discount: string;
  } | null;
  gift: {
    is_gift: boolean;
    is_anonymous: boolean;
    gift_message: string | null;
    gift_wrap: boolean;
    recipient: CartGiftRecipientDto | null;
  };
};

export type CartResponseDto = { success: boolean; message: string; data: CartDataDto };
export type CartCouponsResponseDto = {
  success: boolean;
  message: string;
  data: readonly CartCouponOptionDto[];
};

export type AddCartItemDto = {
  product_variant_id: number;
  city_id: number;
  quantity: number;
  personalization_text?: string;
  personalization_language?: "ar" | "en";
};
export type UpdateCartItemDto = { quantity: number };
export type ApplyCartCouponDto = { code: string };
export type UpdateCartGiftDto = {
  is_gift: boolean;
  gift_wrap: boolean;
  is_anonymous: boolean;
  gift_message: string | null;
  recipient: {
    name: string;
    phone: string;
    city_id: number;
    district: string;
    street_details: string;
  } | null;
};

export const cartContractEndpoints = {
  current: "/cart",
  items: "/cart/items",
  merge: "/cart/merge",
  coupon: "/cart/coupon",
  coupons: "/cart/coupons",
  gift: "/cart/gift",
} as const;
