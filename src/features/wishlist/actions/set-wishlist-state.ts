"use server";

import { hasLocale } from "next-intl";

import { mapProtectedAuthActionError } from "@/features/auth/actions/auth-action-utils";
import {
  setWishlistProductState,
  WishlistAuthenticationError,
} from "@/features/wishlist/server/wishlist-boundary";
import type {
  SetWishlistStateInput,
  WishlistMutationResult,
} from "@/features/wishlist/types/wishlist.types";
import { routing } from "@/i18n/routing";

function parsePositiveBackendId(value: unknown): string | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? value : null;
}

function parseInput(value: unknown): SetWishlistStateInput | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;
  const productId = parsePositiveBackendId(input.productId);
  if (
    typeof input.locale !== "string" ||
    !hasLocale(routing.locales, input.locale) ||
    !productId ||
    typeof input.wishlisted !== "boolean"
  ) {
    return null;
  }

  return {
    locale: input.locale,
    productId,
    wishlisted: input.wishlisted,
  };
}

export async function setWishlistState(
  input: unknown,
): Promise<WishlistMutationResult> {
  const parsedInput = parseInput(input);
  if (!parsedInput) {
    return { ok: false, error: { code: "invalid-input" } };
  }

  try {
    await setWishlistProductState(
      parsedInput.locale,
      Number(parsedInput.productId),
      parsedInput.wishlisted,
    );
    return { ok: true };
  } catch (error) {
    if (error instanceof WishlistAuthenticationError) {
      return { ok: false, error: { code: "unauthorized" } };
    }

    const failure = await mapProtectedAuthActionError(error);
    return {
      ok: false,
      error: {
        code:
          failure.error.code === "unauthorized"
            ? "unauthorized"
            : "service-unavailable",
      },
    };
  }
}
