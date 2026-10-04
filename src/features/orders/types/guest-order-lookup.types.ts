import type { OrderDetails } from "@/features/orders/types/order.types";

export type GuestOrderLookupMethod = "email" | "phone";

export type GuestOrderLookupInput = Readonly<{
  orderNumber: string;
  method: GuestOrderLookupMethod;
  identity: string;
}>;

export type GuestOrderLookupErrorCode =
  | "invalid-input"
  | "lookup-mismatch"
  | "rate-limited"
  | "service-unavailable";

export type GuestOrderLookupResult =
  | Readonly<{ ok: true; order: OrderDetails }>
  | Readonly<{ ok: false; code: GuestOrderLookupErrorCode }>;
