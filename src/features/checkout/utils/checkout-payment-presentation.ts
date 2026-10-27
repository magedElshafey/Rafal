export const checkoutPaymentCodes = ["card", "apple_pay", "bank_transfer", "tap"] as const;
export type CheckoutPaymentCode = (typeof checkoutPaymentCodes)[number];

// Implemented-method boundary. Discovery is presentation data, not an established
// Place eligibility contract. Laravel determines final method acceptance.
// Keep this aligned with the Place serializer (covered by contract tests).
export const legacyCheckoutPaymentMethod = "card" as const;

export function canSubmitCheckoutPayment(selectedCode: string | null): boolean {
  return selectedCode === legacyCheckoutPaymentMethod && canSelectCheckoutPayment(selectedCode);
}

// Matches only the existing compatibility flow. Discovery never expands this list.
// Presentation selection is intentionally disconnected from Place serialization.
export const implementedCheckoutPaymentCodes: readonly CheckoutPaymentCode[] = ["card"];

export function isCheckoutPaymentCode(code: string): code is CheckoutPaymentCode {
  return checkoutPaymentCodes.some((known) => known === code);
}

export function canSelectCheckoutPayment(code: CheckoutPaymentCode): boolean {
  return implementedCheckoutPaymentCodes.includes(code);
}
