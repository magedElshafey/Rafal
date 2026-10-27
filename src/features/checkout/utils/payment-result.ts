import type { OrderDetails } from "@/features/orders/types/order.types";

export type PaymentReturn = { status: "success" | "failed"; orderNumber: string };
export type PaymentResultState = "confirmed" | "failed" | "pending" | "unavailable" | "invalid" | "checking";
export type PaymentResult = { state: PaymentResultState; authorized: boolean };

// A URL safety boundary, not a new Laravel order-number format contract.
export function parsePaymentReturn(value: Record<string, unknown>): PaymentReturn | null {
  if (value.status !== "success" && value.status !== "failed") return null;
  if (typeof value.order_number !== "string" ||
      value.order_number !== value.order_number.trim() ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value.order_number)) return null;
  return { status: value.status, orderNumber: value.order_number };
}

export function resolvePaymentResult(
  orderNumber: string,
  order: Pick<OrderDetails, "orderNumber" | "status" | "requiresVerification" | "payment">,
): PaymentResult {
  if (order.orderNumber !== orderNumber) return { state: "unavailable", authorized: false };
  const pending: PaymentResult = { state: "pending", authorized: true };
  const { payment, status } = order;
  // A stale/contradictory order snapshot must never manufacture a final outcome.
  if (order.requiresVerification === true || status === "pending_verification" ||
      (payment.status !== "paid" && payment.paidAt !== null)) return pending;
  if (payment.status === "paid" && ["confirmed", "processing", "shipped", "delivered"].includes(status)) {
    return { state: "confirmed", authorized: true };
  }
  if (payment.status === "failed" && ["new", "payment_failed", "cancelled"].includes(status)) {
    return { state: "failed", authorized: true };
  }
  return pending;
}
