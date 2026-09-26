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

function parseStoredEntries(
  value: string | undefined,
): Readonly<Record<string, WishlistEntry[]>> {
  if (value === undefined) return {};

  try {
    const candidate: unknown = JSON.parse(value);
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      Array.isArray(candidate)
    ) {
      return {};
    }

    const entries = Object.entries(candidate);
    if (entries.length > 20) return {};

    return Object.fromEntries(
      entries.flatMap(([customerId, productIds]) => {
        if (
          !Array.isArray(productIds) ||
          productIds.length > 100 ||
          !productIds.every((productId) => typeof productId === "string")
        ) {
          return [];
        }

        return [
          [
            customerId,
            Array.from(new Set(productIds))
              .filter(isKnownProductId)
              .map((productId) => ({ productId })),
          ],
        ];
      }),
    );
  } catch {
    return {};
  }
}

export async function readMockWishlistEntries(
  user: AuthenticatedUser,
): Promise<WishlistEntry[]> {
  assertMockWishlistAvailable();

  const cookieStore = await cookies();
  const storedEntries = parseStoredEntries(
    cookieStore.get(MOCK_WISHLIST_COOKIE_NAME)?.value,
  );

  return storedEntries[user.id] ?? [...defaultEntries];
}

export async function writeMockWishlistEntries(
  user: AuthenticatedUser,
  entries: readonly WishlistEntry[],
): Promise<void> {
  assertMockWishlistAvailable();

  const productIds = Array.from(
    new Set(
      entries
        .map((entry) => entry.productId)
        .filter(isKnownProductId),
    ),
  );
  const cookieStore = await cookies();
  const storedEntries = parseStoredEntries(
    cookieStore.get(MOCK_WISHLIST_COOKIE_NAME)?.value,
  );
  const nextStoredEntries = Object.fromEntries([
    ...Object.entries(storedEntries).filter(
      ([customerId]) => customerId !== user.id,
    ),
    [user.id, productIds],
  ]);

  cookieStore.set(
    MOCK_WISHLIST_COOKIE_NAME,
    JSON.stringify(nextStoredEntries),
    {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );
}
