import type { CheckoutVerifyRequest } from "@/features/checkout/types/checkout.types";
import { isValidCheckoutEmail } from "@/features/checkout/utils/checkout-buyer";

const OTP_PATTERN = /^\d{6}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCheckoutVerifyRequest(
  orderNumber: unknown,
  value: unknown,
): CheckoutVerifyRequest | null {
  if (
    typeof orderNumber !== "string" ||
    !orderNumber.trim() ||
    !isRecord(value) ||
    Object.keys(value).some((key) => key !== "email" && key !== "otp") ||
    typeof value.email !== "string" ||
    typeof value.otp !== "string"
  ) {
    return null;
  }

  const email = value.email.trim();
  return isValidCheckoutEmail(email) && OTP_PATTERN.test(value.otp)
    ? { orderNumber: orderNumber.trim(), email, otp: value.otp }
    : null;
}
