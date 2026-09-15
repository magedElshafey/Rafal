import type { Locale } from "next-intl";

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

export const orderFilterValues = [
  "all",
  "in-progress",
  "completed",
  "cancelled",
] as const;
export type OrderFilter = (typeof orderFilterValues)[number];
