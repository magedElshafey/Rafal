import "server-only";

import type { Locale } from "next-intl";

import { getAccessToken } from "@/features/auth/server/auth-session";
import { mergeGuestCartDto } from "@/features/cart/api/cart-api.server";
import { mapCartData } from "@/features/cart/api/cart-mapper";
import {
  deleteGuestCartToken,
  getGuestCartToken,
} from "@/features/cart/server/guest-cart-session";
import type { CartMergeResult } from "@/features/cart/types/cart.types";
import { ApiError } from "@/lib/api/api-error";

export async function mergeGuestCartIntoAuthenticatedCart(
  locale: Locale,
): Promise<CartMergeResult> {
  const [accessToken, guestCartToken] = await Promise.all([
    getAccessToken(),
    getGuestCartToken(),
  ]);

  if (!guestCartToken) return { ok: true, merged: false };
  if (!accessToken) return { ok: false, error: { code: "unauthorized" } };

  try {
    const response = await mergeGuestCartDto(
      accessToken,
      guestCartToken,
      locale,
    );
    if (!response.success) {
      throw new Error("The Cart Merge API returned an unsuccessful response.");
    }

    const cart = mapCartData(response.data);
    await deleteGuestCartToken();
    return { ok: true, merged: true, cart };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { ok: false, error: { code: "unauthorized" } };
    }
    throw error;
  }
}
