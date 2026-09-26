import "server-only";

import type { Locale } from "next-intl";

import {
  parseWishlistCountResponse,
  parseWishlistMutationResponse,
  parseWishlistPageResponse,
} from "@/features/wishlist/api/parse-wishlist-dto";
import type {
  WishlistCountResponseDto,
  WishlistMutationResponseDto,
  WishlistPageResponseDto,
} from "@/features/wishlist/api/wishlist-dto";
import { WISHLIST_PAGE_SIZE } from "@/features/wishlist/types/wishlist.types";
import { serverApi } from "@/lib/api/server-api";

const wishlistEndpoint = "/wishlist";

function authenticatedHeaders(
  accessToken: string,
  locale: Locale,
): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Accept-Language": locale,
  };
}

export async function getWishlistPageDto(
  accessToken: string,
  locale: Locale,
  page: number,
): Promise<WishlistPageResponseDto> {
  const payload = await serverApi.request<unknown>({
    path: wishlistEndpoint,
    headers: authenticatedHeaders(accessToken, locale),
    query: { page, per_page: WISHLIST_PAGE_SIZE },
  });
  return parseWishlistPageResponse(payload);
}

export async function addWishlistProductDto(
  accessToken: string,
  locale: Locale,
  productId: number,
): Promise<WishlistMutationResponseDto> {
  const payload = await serverApi.request<unknown>({
    path: `${wishlistEndpoint}/${productId}`,
    method: "POST",
    headers: authenticatedHeaders(accessToken, locale),
  });
  return parseWishlistMutationResponse(payload);
}

export async function removeWishlistProductDto(
  accessToken: string,
  locale: Locale,
  productId: number,
): Promise<WishlistMutationResponseDto> {
  const payload = await serverApi.request<unknown>({
    path: `${wishlistEndpoint}/${productId}`,
    method: "DELETE",
    headers: authenticatedHeaders(accessToken, locale),
  });
  return parseWishlistMutationResponse(payload);
}

export async function getWishlistCountDto(
  accessToken: string,
  locale: Locale,
): Promise<WishlistCountResponseDto> {
  const payload = await serverApi.request<unknown>({
    path: `${wishlistEndpoint}/count`,
    headers: authenticatedHeaders(accessToken, locale),
  });
  return parseWishlistCountResponse(payload);
}
