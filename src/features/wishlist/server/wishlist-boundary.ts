import "server-only";

import type { Locale } from "next-intl";

import { getAccessToken } from "@/features/auth/server/auth-session";
import { mapProductListResponse } from "@/features/products/api/product-mappers";
import {
  addWishlistProductDto,
  getWishlistCountDto,
  getWishlistPageDto,
  removeWishlistProductDto,
} from "@/features/wishlist/api/wishlist-api.server";
import type {
  WishlistCount,
  WishlistPage,
} from "@/features/wishlist/types/wishlist.types";

export class WishlistAuthenticationError extends Error {
  constructor() {
    super("An authenticated session is required for Wishlist access.");
    this.name = "WishlistAuthenticationError";
  }
}

async function requireAccessToken(): Promise<string> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new WishlistAuthenticationError();
  return accessToken;
}

function assertSuccessfulResponse(response: { success: boolean }): void {
  if (!response.success) {
    throw new Error("The Wishlist API returned an unsuccessful response.");
  }
}

export async function getWishlistPage(
  locale: Locale,
  page: number,
): Promise<WishlistPage> {
  const accessToken = await requireAccessToken();
  const response = await getWishlistPageDto(accessToken, locale, page);
  assertSuccessfulResponse(response);
  return mapProductListResponse(response);
}

export async function setWishlistProductState(
  locale: Locale,
  productId: number,
  wishlisted: boolean,
): Promise<void> {
  const accessToken = await requireAccessToken();
  const response = wishlisted
    ? await addWishlistProductDto(accessToken, locale, productId)
    : await removeWishlistProductDto(accessToken, locale, productId);
  assertSuccessfulResponse(response);
}

export async function getWishlistCount(
  locale: Locale,
): Promise<WishlistCount> {
  const accessToken = await requireAccessToken();
  const response = await getWishlistCountDto(accessToken, locale);
  assertSuccessfulResponse(response);
  return response.data;
}
