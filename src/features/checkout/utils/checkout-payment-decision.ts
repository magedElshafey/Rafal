import type { CheckoutPaymentOutcome, CheckoutPaymentOutcomeContext } from "@/features/checkout/types/checkout.types";

export type CheckoutPaymentDecision = Pick<CheckoutPaymentOutcomeContext, "order" | "payment"> & (
  | { action: "verify-otp" }
  | { action: "confirm-paid" }
  | { action: "hosted-payment" }
  | { action: "hold"; reason: "hosted-payment-inactive" | "unresolved" }
);

// Hosted Place is enabled only with the authenticated, matching request context.
export function decideCheckoutPayment(outcome: CheckoutPaymentOutcome, hostedPlaceSupported = false): CheckoutPaymentDecision {
  const context = { order: outcome.order, payment: outcome.payment };
  switch (outcome.kind) {
    case "verification-required": return { ...context, action: "verify-otp" };
    case "paid": return { ...context, action: "confirm-paid" };
    case "hosted-payment-pending": return hostedPlaceSupported ? { ...context, action: "hosted-payment" } : { ...context, action: "hold", reason: "hosted-payment-inactive" };
    case "unresolved": return { ...context, action: "hold", reason: "unresolved" };
  }
}
