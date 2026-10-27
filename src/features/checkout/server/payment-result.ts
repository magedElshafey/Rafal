import "server-only";

import type { Locale } from "next-intl";
import { getCurrentUserOrderDetails } from "@/features/orders/server/orders-boundary";
import { resolvePaymentResult, type PaymentResult } from "@/features/checkout/utils/payment-result";

export async function readAuthenticatedPaymentResult(locale: Locale, orderNumber: string): Promise<PaymentResult> {
  try {
    const result = await getCurrentUserOrderDetails(locale, orderNumber);
    return result.kind === "found"
      ? resolvePaymentResult(orderNumber, result.order)
      : { state: "unavailable", authorized: false };
  } catch {
    // No raw backend errors, private order details or tokens cross this boundary.
    return { state: "unavailable", authorized: false };
  }
}
