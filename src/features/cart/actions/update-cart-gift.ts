"use server";

import { hasLocale } from "next-intl";

import { updateCurrentCartGift } from "@/features/cart/server/cart-boundary";
import { GuestCartSessionError } from "@/features/cart/server/guest-cart-session";
import type {
  CartGiftError,
  CartGiftMutationResult,
  UpdateCartGiftInput,
} from "@/features/cart/types/cart.types";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";
import { normalizeSaudiMobile } from "@/lib/phone/saudi-mobile";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseInput(value: unknown): UpdateCartGiftInput | null {
  if (!isRecord(value)) return null;
  if (typeof value.giftWrap !== "boolean") return null;
  if (value.kind === "disable-gift") {
    return { kind: "disable-gift", giftWrap: value.giftWrap };
  }
  if (value.kind !== "recipient" || !isRecord(value.recipient)) return null;
  if (
    typeof value.isAnonymous !== "boolean" ||
    (value.message !== null && typeof value.message !== "string")
  ) return null;
  const { name, phone, cityId, district, streetDetails } = value.recipient;
  if (
    typeof name !== "string" || !name.trim() ||
    typeof phone !== "string" || !phone.trim() ||
    typeof district !== "string" || !district.trim() ||
    typeof streetDetails !== "string" || !streetDetails.trim() ||
    typeof cityId !== "number" || !Number.isSafeInteger(cityId) || cityId <= 0
  ) return null;
  const normalizedPhone = normalizeSaudiMobile(phone);
  if (!normalizedPhone) return null;
  return {
    kind: "recipient",
    giftWrap: value.giftWrap,
    isAnonymous: value.isAnonymous,
    message: value.message?.trim() || null,
    recipient: {
      name: name.trim(), phone: normalizedPhone, cityId,
      district: district.trim(), streetDetails: streetDetails.trim(),
    },
  };
}

function mapGiftError(error: unknown): CartGiftError {
  if (error instanceof GuestCartSessionError) return { code: "cart-session-failure" };
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return { code: "unauthorized" };
    if (error.status === 400) return { code: "invalid-input" };
    if (error.status === 422) {
      // Preserve validation field identity, never Laravel's raw messages.
      return {
        code: "validation-rejected",
        fields: isRecord(error.details) ? Object.keys(error.details) : [],
      };
    }
  }
  return { code: "service-unavailable" };
}

export async function updateCartGift(
  value: unknown,
  locale: unknown,
): Promise<CartGiftMutationResult> {
  const input = parseInput(value);
  if (!input || typeof locale !== "string" || !hasLocale(routing.locales, locale)) {
    return { ok: false, error: { code: "invalid-input" } };
  }
  try {
    return { ok: true, cart: await updateCurrentCartGift(input, locale) };
  } catch (error) {
    return { ok: false, error: mapGiftError(error) };
  }
}
