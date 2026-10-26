import type { CheckoutVerifyRequest } from "@/features/checkout/types/checkout.types";
import { isValidSaudiMobile } from "@/lib/phone/saudi-mobile";

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
    Object.keys(value).some((key) => key !== "phone" && key !== "otp") ||
    typeof value.phone !== "string" ||
    typeof value.otp !== "string"
  ) {
    return null;
  }

  return isValidSaudiMobile(value.phone) && OTP_PATTERN.test(value.otp)
    ? { orderNumber: orderNumber.trim(), phone: value.phone, otp: value.otp }
    : null;
}
