export const checkoutPaymentCodes = ["card", "apple_pay", "bank_transfer", "tap"] as const;
export type CheckoutPaymentCode = (typeof checkoutPaymentCodes)[number];

// Implemented-method boundary. Discovery is presentation data, not an established
// Place eligibility contract. Laravel determines final method acceptance.
// Card remains the compatibility default for older browser requests.
export const legacyCheckoutPaymentMethod = "card" as const;

export function canSubmitCheckoutPayment(selectedCode: string | null, advertised = false): boolean {
  return selectedCode !== null && canSelectCheckoutPayment(selectedCode, advertised);
}

export function isCheckoutPaymentCode(code: string): code is CheckoutPaymentCode {
  return checkoutPaymentCodes.some((known) => known === code);
}

export function canSelectCheckoutPayment(code: string, advertised = false): boolean {
  return code === "card" || (advertised && (code === "apple_pay" || code === "tap"));
}
