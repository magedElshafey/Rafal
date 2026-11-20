export const checkoutPaymentCodes = ["card", "apple_pay", "bank_transfer", "tap", "tabby"] as const;
export type CheckoutPaymentCode = (typeof checkoutPaymentCodes)[number];

// Implemented-method boundary. Tabby consumes backend availability without
// duplicating eligibility rules. Laravel determines final method acceptance.
// Card remains the compatibility default for older browser requests.
export const legacyCheckoutPaymentMethod = "card" as const;

export function canSubmitCheckoutPayment(selectedCode: string | null, advertised = false, bnplAvailable = false): boolean {
  return selectedCode !== null && canSelectCheckoutPayment(selectedCode, advertised, bnplAvailable);
}

export function isCheckoutPaymentCode(code: string): code is CheckoutPaymentCode {
  return checkoutPaymentCodes.some((known) => known === code);
}

export function canSelectCheckoutPayment(code: string, advertised = false, bnplAvailable = false): boolean {
  return code === "card" || (advertised && (code === "apple_pay" || code === "tap" || (code === "tabby" && bnplAvailable)));
}
