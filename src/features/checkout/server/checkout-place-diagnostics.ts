import "server-only";

import { CheckoutContractError } from "@/features/checkout/api/parse-checkout-dto";

export type CheckoutPlaceStage =
  | "identity-resolution" | "upstream-request" | "upstream-response"
  | "response-parsing" | "payment-normalization" | "result-mapping"
  | "guest-cookie-cleanup" | "private-response" | "confirmation-check";

export type CheckoutPlaceDiagnostics = {
  stage(stage: CheckoutPlaceStage): void;
  upstreamResponse(status: number): void;
  orderParsed(): void;
  failure(error: unknown): void;
  paymentDecision(facts: CheckoutPaymentDecisionFacts): void;
};

type CheckoutPaymentDecisionFacts = {
  orderStatus: unknown;
  paymentMethod: unknown;
  paymentStatus: unknown;
  paidAtPresent: unknown;
  requiresVerification: unknown;
  outcomeKind: unknown;
  decisionAction: unknown;
  legacyConfirmation: unknown;
};

function allowed(value: unknown, values: readonly string[]): string {
  if (value === null || value === undefined) return "missing";
  return typeof value === "string" && values.includes(value) ? value : "unrecognized";
}

function booleanState(value: unknown): boolean | "unrecognized" {
  return typeof value === "boolean" ? value : "unrecognized";
}

function safePaymentDecision(facts: CheckoutPaymentDecisionFacts) {
  return {
    orderStatus: allowed(facts.orderStatus, ["new", "confirmed", "pending_verification", "cancelled"]),
    paymentMethod: allowed(facts.paymentMethod, ["card", "tap", "apple_pay", "bank_transfer"]),
    paymentStatus: allowed(facts.paymentStatus, ["paid", "pending"]),
    paidAtPresent: booleanState(facts.paidAtPresent),
    requiresVerification: facts.requiresVerification === null || facts.requiresVerification === undefined
      ? "missing" : booleanState(facts.requiresVerification),
    outcomeKind: allowed(facts.outcomeKind, ["paid", "verification-required", "hosted-payment-pending", "unresolved"]),
    decisionAction: allowed(facts.decisionAction, ["confirm-paid", "verify-otp", "hosted-payment", "hold"]),
    legacyConfirmation: booleanState(facts.legacyConfirmation),
  };
}

// Exact contract vocabulary only. Neither error messages nor backend values enter logs.
const paths = new Set([
  "response", "response.success", "response.message", "response.data", "response.meta",
  ...["id", "order_number", "display_number", "status", "requires_verification", "placed_at", "verification_expires_at"].map(field => `response.data.${field}`),
  "response.data.payment", ...["method", "status", "paid_at"].map(field => `response.data.payment.${field}`),
  "response.data.money", ...["subtotal", "discount_total", "shipping_fee", "personalization_total", "gift_wrap_fee", "total", "currency", "vat_amount", "taxable_amount", "vat", "vat.rate", "vat.amount"].map(field => `response.data.money.${field}`),
  "response.data.shipping_address", ...["recipient_name", "recipient_phone", "city", "city.id", "city.name", "district", "street_details"].map(field => `response.data.shipping_address.${field}`),
  "response.meta.requires_verification", "response.meta.verification_expires_at", "response.meta.payment",
  "result.handoff", "result.handoff.paymentUrl", "result.handoff.chargeId", "result.handoff.expiresAt",
  ...["payment_url", "charge_id", "expires_at"].map(field => `response.meta.payment.${field}`),
]);
const expectedTypes = new Set([
  "an object", "a string", "a non-empty string", "a boolean", "a positive integer",
  "a non-negative decimal string", "one supported VAT representation", "an ISO timestamp",
  "an absolute HTTPS URL without credentials", "a result supported by the existing Checkout flow",
  "an approved hosted payment URL", "an unexpired ISO timestamp",
]);
const errorNames = new Set([
  "Error", "TypeError", "SyntaxError", "RangeError", "AbortError", "TimeoutError",
  "ApiError", "CheckoutContractError", "CheckoutCartSessionError", "CheckoutIdentityMismatchError", "GuestCartSessionError",
]);

export function createCheckoutPlaceDiagnostics(operation: "place" | "verify" = "place"): CheckoutPlaceDiagnostics {
  const enabled = typeof process !== "undefined" && process.env.NODE_ENV === "development";
  let stage: CheckoutPlaceStage = "identity-resolution";
  let upstreamStatus: number | undefined;
  let upstreamSuccessReceived = false;
  let orderIdentifierParsed = false;
  let paymentDecision: ReturnType<typeof safePaymentDecision> | undefined;
  function emit(event: "stage" | "failure" | "payment-decision", error?: unknown) {
    if (!enabled) return;
    try {
      const record = {
        event, stage, upstreamSuccessReceived, orderIdentifierParsed,
        ...(upstreamStatus === undefined ? {} : { upstreamStatus }),
        ...(paymentDecision === undefined ? {} : { paymentDecision }),
        ...(event === "failure" ? {
          errorName: error instanceof Error && errorNames.has(error.name) ? error.name : "UnknownError",
          ...(error instanceof CheckoutContractError ? {
            contractPath: paths.has(error.path) ? error.path : "redacted",
            expectedType: expectedTypes.has(error.expected) ? error.expected : "redacted",
          } : {}),
        } : {}),
      };
      const prefix = operation === "verify" ? "[checkout:verify]" : "[checkout:place]";
      if (event === "failure") console.error(prefix, record);
      else console.info(prefix, record);
    } catch { /* Diagnostics must never change Checkout behavior. */ }
  }
  return {
    stage(next) { stage = next; emit("stage"); },
    upstreamResponse(status) {
      if (Number.isInteger(status) && status >= 100 && status <= 599) {
        upstreamStatus = status;
        upstreamSuccessReceived = status >= 200 && status < 300;
      }
      stage = "upstream-response";
      emit("stage");
    },
    orderParsed() { orderIdentifierParsed = true; },
    failure(error) { emit("failure", error); },
    paymentDecision(facts) {
      if (!enabled) return;
      try {
        paymentDecision = safePaymentDecision(facts);
        emit("payment-decision");
      } catch { /* Diagnostics must never change Checkout behavior. */ }
    },
  };
}
