"use server";

import { hasLocale } from "next-intl";

import { updateCurrentCartGift } from "@/features/cart/server/cart-boundary";
import { GuestCartSessionError } from "@/features/cart/server/guest-cart-session";
import type {
  CartGiftError,
  CartGiftMutationResult,
  CartGiftRecipientInput,
  UpdateCartGiftInput,
} from "@/features/cart/types/cart.types";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

const UPDATE_FIELD_NAMES = [
  "isGift",
  "giftWrap",
  "isAnonymous",
  "message",
  "recipient",
] as const;
const RECIPIENT_FIELD_NAMES = [
  "name",
  "phone",
  "cityId",
  "district",
  "streetDetails",
] as const;
const UPDATE_FIELDS = new Set<string>(UPDATE_FIELD_NAMES);
const RECIPIENT_FIELDS = new Set<string>(RECIPIENT_FIELD_NAMES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(source: Record<string, unknown>, allowed: Set<string>) {
  return Object.keys(source).every((key) => allowed.has(key));
}

function normalizedRequiredString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function parseRecipient(value: unknown): CartGiftRecipientInput | null {
  if (!isRecord(value) || !hasOnlyKeys(value, RECIPIENT_FIELDS)) return null;
  if (!RECIPIENT_FIELD_NAMES.every((field) => field in value)) return null;

  const name = normalizedRequiredString(value.name);
  const phone = normalizedRequiredString(value.phone);
  const district = normalizedRequiredString(value.district);
  const streetDetails = normalizedRequiredString(value.streetDetails);
  if (
    !name ||
    !phone ||
    !district ||
    !streetDetails ||
    typeof value.cityId !== "number" ||
    !Number.isSafeInteger(value.cityId) ||
    value.cityId <= 0
  ) {
    return null;
  }

  return {
    name,
    phone,
    cityId: value.cityId,
    district,
    streetDetails,
  };
}

function parseInput(value: unknown): UpdateCartGiftInput | null {
  if (!isRecord(value) || !hasOnlyKeys(value, UPDATE_FIELDS)) return null;
  if (Object.keys(value).length === 0) return null;

  const input: {
    isGift?: boolean;
    giftWrap?: boolean;
    isAnonymous?: boolean;
    message?: string | null;
    recipient?: CartGiftRecipientInput;
  } = {};
  if ("isGift" in value) {
    if (typeof value.isGift !== "boolean") return null;
    input.isGift = value.isGift;
  }
  if ("giftWrap" in value) {
    if (typeof value.giftWrap !== "boolean") return null;
    input.giftWrap = value.giftWrap;
  }
  if ("isAnonymous" in value) {
    if (typeof value.isAnonymous !== "boolean") return null;
    input.isAnonymous = value.isAnonymous;
  }
  if ("message" in value) {
    if (value.message !== null && typeof value.message !== "string")
      return null;
    input.message = value.message;
  }
  if ("recipient" in value) {
    const recipient = parseRecipient(value.recipient);
    if (!recipient) return null;
    input.recipient = recipient;
  }
  if (input.isGift === true && !input.recipient) return null;

  return input as UpdateCartGiftInput;
}

function validationFields(details: unknown): readonly string[] {
  if (!isRecord(details)) return [];
  return Object.keys(details);
}

function mapGiftActionError(error: unknown): CartGiftError {
  if (error instanceof GuestCartSessionError) {
    return { code: "cart-session-failure" };
  }
  if (error instanceof ApiError) {
    if (error.status === 400) return { code: "invalid-input" };
    if (error.status === 401 || error.status === 403) {
      return { code: "unauthorized" };
    }
    if (error.status === 422) {
      return {
        code: "validation-rejected",
        fields: validationFields(error.details),
      };
    }
  }
  return { code: "service-unavailable" };
}

export async function updateCartGift(
  value: unknown,
  locale: unknown,
): Promise<CartGiftMutationResult> {
  if (typeof locale !== "string" || !hasLocale(routing.locales, locale)) {
    return { ok: false, error: { code: "invalid-input" } };
  }

  const input = parseInput(value);
  if (!input) return { ok: false, error: { code: "invalid-input" } };

  try {
    return {
      ok: true,
      cart: await updateCurrentCartGift(input, locale),
    };
  } catch (error) {
    return { ok: false, error: mapGiftActionError(error) };
  }
}
