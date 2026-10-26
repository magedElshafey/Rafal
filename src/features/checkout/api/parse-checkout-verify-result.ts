import { CheckoutContractError } from "@/features/checkout/api/parse-checkout-dto";
import { parseCheckoutPlaceResult } from "@/features/checkout/api/parse-checkout-place-result";
import type { CheckoutHostedPaymentResult, CheckoutVerifyResult } from "@/features/checkout/types/checkout.types";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

const { parseRecord, parseNonEmptyString } = createRuntimeValidators(
  (path, expected) => new CheckoutContractError(path, expected),
);

// Shared destination boundary; preserves the exact backend URL, including its query.
export function parseCheckoutHostedPaymentResult(value: unknown, now?: number): CheckoutHostedPaymentResult {
  const source = parseRecord(value, "result");
  if (source.kind !== "hosted-payment-required") throw new CheckoutContractError("result.kind", "a hosted payment result");
  const handoff = parseRecord(source.handoff, "result.handoff");
  const paymentUrl = parseNonEmptyString(handoff.paymentUrl, "result.handoff.paymentUrl");
  try {
    const url = new URL(paymentUrl);
    if (paymentUrl !== paymentUrl.trim() || /[\s\\]/.test(paymentUrl) ||
      url.protocol !== "https:" || url.hostname !== "checkout.tap.company" ||
      url.port !== "" || url.username || url.password) throw new Error();
  } catch {
    throw new CheckoutContractError("result.handoff.paymentUrl", "an approved hosted payment URL");
  }
  const expiresAt = parseNonEmptyString(handoff.expiresAt, "result.handoff.expiresAt");
  const expiry = Date.parse(expiresAt);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(expiresAt) || !Number.isFinite(expiry) || (now !== undefined && expiry <= now)) {
    throw new CheckoutContractError("result.handoff.expiresAt", "an unexpired ISO timestamp");
  }
  return {
    kind: "hosted-payment-required",
    orderNumber: parseNonEmptyString(source.orderNumber, "result.orderNumber"),
    displayNumber: parseNonEmptyString(source.displayNumber, "result.displayNumber"),
    handoff: { paymentUrl, expiresAt, chargeId: parseNonEmptyString(handoff.chargeId, "result.handoff.chargeId") },
  };
}

export function parseCheckoutVerifyResult(value: unknown): CheckoutVerifyResult {
  const source = parseRecord(value, "result");
  if (source.kind === "hosted-payment-required") return parseCheckoutHostedPaymentResult(source, Date.now());
  const result = parseCheckoutPlaceResult(source);
  if (result.kind !== "confirmed") throw new CheckoutContractError("result.kind", "a confirmed order");
  return result;
}
