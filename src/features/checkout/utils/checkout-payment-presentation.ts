export const checkoutPaymentCodes = ["card", "apple_pay", "bank_transfer", "tap"] as const;
export type CheckoutPaymentCode = (typeof checkoutPaymentCodes)[number];

// Explicit legacy rollout boundary, not discovery-driven eligibility. Making
// discovery authoritative is deferred until its availability contract is confirmed.
// Keep this aligned with the unchanged Place serializer (covered by contract tests).
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
