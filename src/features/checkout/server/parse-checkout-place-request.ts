import type { CheckoutPlaceRequest } from "@/features/checkout/types/checkout.types";
import { checkoutGuestBuyerFromDraft } from "@/features/checkout/utils/checkout-buyer";
import { parseCheckoutDestination } from "@/features/checkout/server/parse-checkout-quote-request";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
    ? value
    : null;
}

export function parseCheckoutPlaceRequest(
  value: unknown,
): CheckoutPlaceRequest | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["destination", "shippingMethodId", "buyer", "paymentMethod", "usePoints"])
  ) {
    return null;
  }

  const destination = parseCheckoutDestination(value.destination);
  const shippingMethodId = positiveInteger(value.shippingMethodId);
  if (!destination || !shippingMethodId || !isRecord(value.buyer)) return null;
  const method = value.paymentMethod;
  if (value.usePoints !== undefined && value.usePoints !== 0 && value.usePoints !== 1) return null;
  const points: Pick<CheckoutPlaceRequest, "usePoints"> = value.usePoints === undefined ? {} : { usePoints: value.usePoints };
  if (method !== undefined && method !== "card" && method !== "apple_pay" && method !== "tap") return null;

  if (
    value.buyer.kind === "authenticated" &&
    hasOnlyKeys(value.buyer, ["kind"])
  ) {
    return {
      destination,
      ...points,
      shippingMethodId,
      buyer: { kind: "authenticated" },
      ...(method === undefined ? {} : { paymentMethod: method }),
    };
  }

  if (
    value.buyer.kind !== "guest" || value.usePoints === 1 ||
    !hasOnlyKeys(value.buyer, ["kind", "name", "email", "phone"]) ||
    typeof value.buyer.name !== "string" ||
    typeof value.buyer.email !== "string" ||
    typeof value.buyer.phone !== "string"
  ) {
    return null;
  }

  const buyer = checkoutGuestBuyerFromDraft({
    name: value.buyer.name,
    email: value.buyer.email,
    phone: value.buyer.phone,
  });
  return buyer ? { destination, shippingMethodId, buyer, ...points, ...(method === undefined ? {} : { paymentMethod: method }) } : null;
}
