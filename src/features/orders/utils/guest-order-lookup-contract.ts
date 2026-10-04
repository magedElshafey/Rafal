import type { GuestOrderLookupInput } from "@/features/orders/types/guest-order-lookup.types";
import { normalizeSaudiMobile } from "@/lib/phone/saudi-mobile";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORDER_NUMBER_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseGuestOrderLookupInput(
  value: unknown,
): GuestOrderLookupInput | null {
  if (!isRecord(value)) return null;
  if ("email" in value || "phone" in value) return null;

  const orderNumber =
    typeof value.orderNumber === "string" ? value.orderNumber.trim() : "";
  const identity =
    typeof value.identity === "string" ? value.identity.trim() : "";

  if (
    !orderNumber ||
    orderNumber.length > ORDER_NUMBER_MAX_LENGTH ||
    !identity
  ) {
    return null;
  }

  if (value.method === "email") {
    const email = identity.toLowerCase();
    if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
      return null;
    }
    return { orderNumber, method: "email", identity: email };
  }

  if (value.method === "phone") {
    const phone = normalizeSaudiMobile(identity);
    return phone ? { orderNumber, method: "phone", identity: phone } : null;
  }

  return null;
}

export function buildGuestOrderLookupFormData(
  input: GuestOrderLookupInput,
): FormData {
  const formData = new FormData();
  formData.set("order_number", input.orderNumber);
  formData.set(input.method, input.identity);
  return formData;
}
