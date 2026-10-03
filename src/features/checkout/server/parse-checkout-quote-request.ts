import "server-only";

import type {
  CheckoutAddress,
  CheckoutDestination,
  CheckoutQuoteRequest,
} from "@/features/checkout/types/checkout.types";
import { normalizeSaudiMobile } from "@/lib/phone/saudi-mobile";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
    ? value
    : null;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

function parseAddress(value: unknown): CheckoutAddress | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "recipientName",
      "recipientPhone",
      "cityId",
      "district",
      "streetDetails",
    ])
  ) {
    return null;
  }

  const recipientName = nonEmptyString(value.recipientName);
  const recipientPhone =
    typeof value.recipientPhone === "string"
      ? normalizeSaudiMobile(value.recipientPhone)
      : null;
  const cityId = positiveInteger(value.cityId);
  const district = nonEmptyString(value.district);
  const streetDetails = nonEmptyString(value.streetDetails);

  if (
    !recipientName ||
    !recipientPhone ||
    !cityId ||
    !district ||
    !streetDetails
  ) {
    return null;
  }

  return {
    recipientName,
    recipientPhone,
    cityId,
    district,
    streetDetails,
  };
}

export function parseCheckoutDestination(
  value: unknown,
): CheckoutDestination | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;

  if (value.kind === "saved-address") {
    if (!hasOnlyKeys(value, ["kind", "addressId", "cityId"])) return null;
    const addressId = positiveInteger(value.addressId);
    const cityId = positiveInteger(value.cityId);
    return addressId && cityId
      ? { kind: "saved-address", addressId, cityId }
      : null;
  }

  if (value.kind === "one-time-address") {
    if (!hasOnlyKeys(value, ["kind", "address"])) return null;
    const address = parseAddress(value.address);
    return address ? { kind: "one-time-address", address } : null;
  }

  if (value.kind === "gift-recipient") {
    if (!hasOnlyKeys(value, ["kind", "recipient"])) return null;
    const recipient = parseAddress(value.recipient);
    return recipient ? { kind: "gift-recipient", recipient } : null;
  }

  return null;
}

export function parseCheckoutQuoteRequest(
  value: unknown,
): CheckoutQuoteRequest | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["destination", "shippingMethodId"])
  ) {
    return null;
  }

  const destination = parseCheckoutDestination(value.destination);
  if (!destination) return null;

  if (value.shippingMethodId === undefined) return { destination };

  const shippingMethodId = positiveInteger(value.shippingMethodId);
  return shippingMethodId ? { destination, shippingMethodId } : null;
}
