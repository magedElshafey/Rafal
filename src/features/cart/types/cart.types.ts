import type { ProductPersonalizationInput } from "@/features/products/types/product-details.types";

export type CartMoney = { amount: string; currency: string };

export type AddCartLineInput = {
  productId: string;
  variantId: string;
  quantity: number;
  personalization?: ProductPersonalizationInput;
};

export type UpdateCartLineInput = { lineId: string; quantity: number };

export type CartLinePersonalization = {
  language: string | null;
  raw: unknown;
  text: string | null;
};

export type CartLine = {
  id: string;
  product: {
    id: string;
    slug: string;
    name: string;
    image: { id: string; src: string } | null;
    personalizable: boolean;
  };
  variant: {
    id: string;
    sku: string;
    attributes: Readonly<Record<string, string | number | boolean>>;
  };
  personalization: CartLinePersonalization | null;
  quantity: number;
  stock: { status: "ok" | "low" | "out_of_stock"; available: number };
  unitRegularPrice: CartMoney;
  unitPrice: CartMoney;
  discountActive: boolean;
  personalizationFee: CartMoney;
  lineTotal: CartMoney;
};

export type CartSummary = {
  lineCount: number;
  totalQuantity: number;
  subtotal: CartMoney;
  productDiscountTotal: CartMoney;
  personalizationTotal: CartMoney;
  couponDiscount: CartMoney;
  giftWrapFee: CartMoney;
  shippingFee: CartMoney | null;
  freeShipping: {
    enabled: boolean;
    threshold: CartMoney | null;
    qualifies: boolean;
    remaining: CartMoney | null;
  };
  total: CartMoney;
  vat: { rate: string; includedAmount: CartMoney };
};

export type CartSnapshot = {
  city: { id: number; name: string } | null;
  lines: readonly CartLine[];
  summary: CartSummary;
  coupon: {
    code: string;
    name: string;
    applied: boolean;
    discount: CartMoney;
  } | null;
  gift: {
    isGift: boolean;
    isAnonymous: boolean;
    message: string | null;
    giftWrap: boolean;
    recipient: unknown;
  };
};

export type CartMutationError =
  | { code: "invalid-input" }
  | { code: "product-unavailable" }
  | { code: "variant-invalid" }
  | { code: "location-required" }
  | { code: "unavailable-at-location" }
  | { code: "out-of-stock" }
  | { code: "quantity-limit-exceeded"; maxOrderQuantity: number }
  | { code: "invalid-personalization"; reason?: string }
  | { code: "validation-rejected"; fields: readonly string[] }
  | { code: "line-not-found" }
  | { code: "cart-session-failure" }
  | { code: "service-unavailable" };

export type CartMutationResult =
  | { ok: true; cart: CartSnapshot }
  | { ok: false; error: CartMutationError };

export type AddCartLineError = CartMutationError;
export type AddCartLineResult = CartMutationResult;
