import type { ProductPersonalizationInput } from "@/features/products/types/product-details.types";
import type { VariantAttributes } from "@/lib/variant-attributes";

export type CartMoney = { amount: string; currency: string };

export type CartGiftRecipient = {
  name: string;
  phone: string;
  city: { id: number; name: string };
  district: string;
  streetDetails: string;
};

export type CartGiftRecipientInput = {
  name: string;
  phone: string;
  cityId: number;
  district: string;
  streetDetails: string;
};

// User intent, not the Laravel request DTO. The caller supplies the canonical
// companion value required by Laravel so the mutation needs no preflight read.
export type UpdateCartGiftInput =
  | {
      kind: "disable-gift";
      giftWrap: boolean;
      isAnonymous: boolean;
      message: string | null;
    }
  | {
      kind: "recipient";
      giftWrap: boolean;
      recipient: CartGiftRecipientInput;
      isAnonymous: boolean;
      message: string | null;
    };

export type CartGiftError =
  | { code: "invalid-input" }
  | { code: "validation-rejected"; fields: readonly string[] }
  | { code: "unauthorized" }
  | { code: "cart-session-failure" }
  | { code: "service-unavailable" };

export type CartGiftMutationResult =
  | { ok: true; cart: CartSnapshot }
  | { ok: false; error: CartGiftError };

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

export type CartLineAvailability = {
  cityId: number;
  available: number;
  inStock: boolean;
};

export type CartLine = {
  id: string;
  product: {
    id: string;
    slug: string;
    name: string;
    image: { src: string } | null;
    personalizable: boolean;
  };
  variant: {
    id: string;
    sku: string;
    attributes: VariantAttributes;
  };
  personalization: CartLinePersonalization | null;
  quantity: number;
  stock: { status: "ok" | "low" | "out_of_stock"; available: number };
  availability?: CartLineAvailability;
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
    recipient: CartGiftRecipient | null;
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

export type CartMergeResult =
  | { ok: true; merged: false }
  | { ok: true; merged: true; cart: CartSnapshot }
  | {
      ok: false;
      error: { code: "unauthorized" | "service-unavailable" };
    };
export type CartCouponError = {
  code:
    | "invalid-input"
    | "rejected"
    | "unauthorized"
    | "service-unavailable";
};

export type CartCouponMutationResult =
  | { ok: true; cart: CartSnapshot }
  | { ok: false; error: CartCouponError };
