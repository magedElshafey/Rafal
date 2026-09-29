"use server";

import { hasLocale } from "next-intl";

import { quoteCurrentCheckout } from "@/features/checkout/server/checkout-boundary";
import { mapCheckoutQuoteError } from "@/features/checkout/server/checkout-quote-error";
import type {
  CheckoutQuoteInputField,
  CheckoutQuoteRequest,
  CheckoutQuoteResult,
} from "@/features/checkout/types/checkout.types";
import { routing } from "@/i18n/routing";

type ParseResult =
  | { ok: true; request: CheckoutQuoteRequest }
  | { ok: false; fields: readonly CheckoutQuoteInputField[] };

const topLevelFields = new Set(["cityId", "addressId", "address"]);
const addressFields = new Set([
  "recipientName",
  "recipientPhone",
  "district",
  "streetDetails",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
    ? value
    : null;
}

function parseQuoteRequest(value: unknown): ParseResult {
  if (
    !isRecord(value) ||
    Object.keys(value).some((field) => !topLevelFields.has(field))
  ) {
    return { ok: false, fields: [] };
  }

  const cityId = positiveInteger(value.cityId);
  const hasAddressId = "addressId" in value;
  const hasAddress = "address" in value;
  const baseErrors: CheckoutQuoteInputField[] = cityId ? [] : ["cityId"];

  if (hasAddressId === hasAddress) {
    return { ok: false, fields: baseErrors };
  }

  if (hasAddressId) {
    const addressId = positiveInteger(value.addressId);
    const fields = addressId ? baseErrors : [...baseErrors, "addressId" as const];

    return cityId && addressId
      ? { ok: true, request: { cityId, addressId } }
      : { ok: false, fields };
  }

  if (
    !isRecord(value.address) ||
    Object.keys(value.address).some((field) => !addressFields.has(field))
  ) {
    return { ok: false, fields: baseErrors };
  }

  const sourceAddress = value.address;
  const fields: CheckoutQuoteInputField[] = [...baseErrors];
  const readRequired = (
    field: Exclude<CheckoutQuoteInputField, "cityId" | "addressId">,
  ) => {
    const raw = sourceAddress[field];
    if (typeof raw !== "string" || !raw.trim()) {
      fields.push(field);
      return "";
    }
    return raw.trim();
  };

  const address = {
    recipientName: readRequired("recipientName"),
    recipientPhone: readRequired("recipientPhone"),
    district: readRequired("district"),
    streetDetails: readRequired("streetDetails"),
  };

  return cityId && fields.length === 0
    ? { ok: true, request: { cityId, address } }
    : { ok: false, fields };
}

export async function quoteCurrentCheckoutAction(
  value: unknown,
  locale: unknown,
): Promise<CheckoutQuoteResult> {
  if (
    typeof locale !== "string" ||
    !hasLocale(routing.locales, locale)
  ) {
    return { ok: false, error: { code: "invalid-input", fields: [] } };
  }

  const parsed = parseQuoteRequest(value);
  if (!parsed.ok) {
    return {
      ok: false,
      error: { code: "invalid-input", fields: parsed.fields },
    };
  }

  try {
    return {
      ok: true,
      quote: await quoteCurrentCheckout(locale, parsed.request),
    };
  } catch (error) {
    return { ok: false, error: mapCheckoutQuoteError(error) };
  }
}