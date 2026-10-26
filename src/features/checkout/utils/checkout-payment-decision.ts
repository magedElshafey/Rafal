import type { CheckoutPaymentOutcome, CheckoutPaymentOutcomeContext } from "@/features/checkout/types/checkout.types";

export type CheckoutPaymentDecision = Pick<CheckoutPaymentOutcomeContext, "order" | "payment"> & (
  | { action: "verify-otp" }
  | { action: "confirm-paid" }
  | { action: "hold"; reason: "hosted-payment-inactive" | "unresolved" }
);

// Runtime-neutral preparation for orchestration. There is deliberately no redirect
// action: structural handoff validation is not authorization to navigate or clean up.
export function decideCheckoutPayment(outcome: CheckoutPaymentOutcome): CheckoutPaymentDecision {
  const context = { order: outcome.order, payment: outcome.payment };
  switch (outcome.kind) {
    case "verification-required": return { ...context, action: "verify-otp" };
    case "paid": return { ...context, action: "confirm-paid" };
    case "hosted-payment-pending": return { ...context, action: "hold", reason: "hosted-payment-inactive" };
    case "unresolved": return { ...context, action: "hold", reason: "unresolved" };
  }
}
