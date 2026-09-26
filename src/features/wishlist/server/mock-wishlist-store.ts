import "server-only";

import { cookies } from "next/headers";

import { serverEnv } from "@/config/server-env";
import type { AuthenticatedUser } from "@/features/auth/types/authenticated-user.types";
import {
  isKnownProductId,
  mockCatalogProductIds,
} from "@/features/products/server/mock-product-catalog";
import type { WishlistEntry } from "@/features/wishlist/types/wishlist.types";

const MOCK_WISHLIST_COOKIE_NAME = "rafal_mock_wishlist";
const defaultEntries: readonly WishlistEntry[] =
  mockCatalogProductIds.slice(0, 4).map((productId) => ({ productId }));

function assertMockWishlistAvailable() {
  if (!serverEnv.useMockApi || process.env.NODE_ENV === "production") {
    throw new Error("The mock Wishlist store is unavailable.");
  }
}

function parseEntries(value: string | undefined): WishlistEntry[] | null {
  if (value === undefined) return null;

  try {
    const productIds: unknown = JSON.parse(value);
    if (
      !Array.isArray(productIds) ||
      productIds.length > 100 ||
      !productIds.every((productId) => typeof productId === "string")
    ) {
      return null;
    }

    const validatedProductIds = productIds as string[];

    return Array.from(new Set(validatedProductIds))
      .filter(isKnownProductId)
      .map((productId) => ({ productId }));
  } catch {
    return null;
  }
}

export async function readMockWishlistEntries(
  user: AuthenticatedUser,
): Promise<WishlistEntry[]> {
  assertMockWishlistAvailable();
  void user;

  const cookieStore = await cookies();
  const storedEntries = parseEntries(
    cookieStore.get(MOCK_WISHLIST_COOKIE_NAME)?.value,
  );

  return storedEntries ?? [...defaultEntries];
}

export async function writeMockWishlistEntries(
  user: AuthenticatedUser,
  entries: readonly WishlistEntry[],
): Promise<void> {
  assertMockWishlistAvailable();
  void user;

  const productIds = Array.from(
    new Set(
      entries
        .map((entry) => entry.productId)
        .filter(isKnownProductId),
    ),
  );
  const cookieStore = await cookies();

  cookieStore.set(MOCK_WISHLIST_COOKIE_NAME, JSON.stringify(productIds), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
