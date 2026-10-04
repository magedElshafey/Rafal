import type { Locale } from "next-intl";
import type { VariantAttributes } from "@/lib/variant-attributes";

export type OrderStatus =
  | "new"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";
export type OrderTimelineStage =
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";
export type OrderPaymentMethod = "mada" | "credit-card";

export type OrderTimelineEvent = {
  stage: OrderTimelineStage;
  completedAt?: string;
};

export type OrderItem = {
  id: string;
  imageUrl: string;
  name: Record<Locale, string>;
  details: Record<Locale, string>[];
  quantity: number;
  unitPrice: number;
};

export type OrderAddress = {
  recipientName: string;
  city: string;
  district: string;
  street: string;
  building: string;
};

export type OrderPaymentSummary = {
  method: OrderPaymentMethod;
  total: number;
  currency: "SAR";
};

export type OrderGiftSnapshot = {
  recipientName: string;
  recipientPhone?: string;
  city: string;
  district: string;
  streetDetails: string;
  giftMessage?: string;
};

export type Order = {
  id: string;
  placedAt: string;
  status: OrderStatus;
  shipmentTrackingNumber?: string;
  gift?: OrderGiftSnapshot;
  items: OrderItem[];
  timeline: OrderTimelineEvent[];
  shippingAddress: OrderAddress;
  payment: OrderPaymentSummary;
};

export type OrderListItem = Readonly<{
  orderNumber: string;
  displayNumber: string;
  placedAt: string;
  customerStatus: string;
  statusLabel: string;
  total: string;
  currency: string;
  itemsCount: number;
  firstItem: Readonly<{
    name: string;
    imageUrl: string | null;
  }>;
}>;

export type OrdersPage = Readonly<{
  orders: readonly OrderListItem[];
  pagination: Readonly<{
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  }>;
}>;

export type OrderDetails = Readonly<{
  id: number;
  orderNumber: string;
  displayNumber: string;
  status: string;
  customerStatus: string;
  requiresVerification: boolean | null;
  placedAt: string;
  items: readonly Readonly<{
    id: number;
    productName: string;
    variantSku: string | null;
    variantAttributes: VariantAttributes;
    quantity: number;
    unitPrice: string;
    discountAmount: string | null;
    lineTotal: string;
  }>[];
  gift: Readonly<{
    isGift: boolean;
    isAnonymous: boolean | null;
    giftMessage: string | null;
    recipient: Readonly<{
      name: string | null;
      phone: string | null;
      city: Readonly<{ id: number; name: string }> | null;
      district: string | null;
      streetDetails: string | null;
    }> | null;
  }> | null;
  shippingAddress: Readonly<{
    recipientName: string;
    recipientPhone: string;
    city: Readonly<{ id: number; name: string }> | null;
    district: string;
    streetDetails: string;
  }>;
  shippingMethod: Readonly<{
    id: number | null;
    code: string | null;
    name: string | null;
  }> | null;
  money: Readonly<{
    subtotal: string | null;
    discountTotal: string | null;
    shippingFee: string | null;
    personalizationTotal: string | null;
    giftWrapFee: string | null;
    taxableAmount: string | null;
    vat: Readonly<{ rate: string | null; amount: string | null }> | null;
    total: string;
    currency: string;
  }>;
  payment: Readonly<{
    method: string | null;
    status: string;
    paidAt: string | null;
  }>;
  verificationExpiresAt: string | null;
  timeline: readonly Readonly<{ step: string; reached: boolean }>[];
  capabilities: Readonly<{
    canCancel: boolean;
    canReorder: boolean;
    canRequestReturn: boolean;
  }>;
}>;

export const orderFilterValues = [
  "all",
  "in-progress",
  "completed",
  "cancelled",
] as const;
export type OrderFilter = (typeof orderFilterValues)[number];
