"use server";

import { hasLocale } from "next-intl";

import { mapProtectedAuthActionError } from "@/features/auth/actions/auth-action-utils";
import {
  applyCouponToCurrentCart,
  CartCouponAuthenticationError,
  removeCouponFromCurrentCart,
} from "@/features/cart/server/cart-boundary";
import type {
  CartCouponMutationResult,
  CartCouponError,
} from "@/features/cart/types/cart.types";
import { routing } from "@/i18n/routing";

async function mapCouponActionError(
  error: unknown,
): Promise<CartCouponError> {
  if (error instanceof CartCouponAuthenticationError) {
    return { code: "unauthorized" };
  }

  const failure = await mapProtectedAuthActionError(error);
  if (failure.error.code === "unauthorized") {
    return { code: "unauthorized" };
  }
  if (failure.error.code === "invalid-input") {
    return { code: "rejected" };
  }
  return { code: "service-unavailable" };
}

function isSupportedLocale(value: unknown): value is (typeof routing.locales)[number] {
  return typeof value === "string" && hasLocale(routing.locales, value);
}

export async function applyCartCoupon(
  code: unknown,
  locale: unknown,
): Promise<CartCouponMutationResult> {
  if (typeof code !== "string" || !isSupportedLocale(locale)) {
    return { ok: false, error: { code: "invalid-input" } };
  }

  const normalizedCode = code.trim();
  if (!normalizedCode) {
    return { ok: false, error: { code: "invalid-input" } };
  }

  try {
    return {
      ok: true,
      cart: await applyCouponToCurrentCart(normalizedCode, locale),
    };
  } catch (error) {
    return { ok: false, error: await mapCouponActionError(error) };
  }
}

export async function removeCartCoupon(
  locale: unknown,
): Promise<CartCouponMutationResult> {
  if (!isSupportedLocale(locale)) {
    return { ok: false, error: { code: "invalid-input" } };
  }

  try {
    return { ok: true, cart: await removeCouponFromCurrentCart(locale) };
  } catch (error) {
    return { ok: false, error: await mapCouponActionError(error) };
  }
}
