import { queryOptions } from "@tanstack/react-query";

import type { WishlistMembership } from "@/features/wishlist/types/wishlist.types";

export const wishlistMembershipQueryKey = [
  "wishlist",
  "membership",
] as const;

export function wishlistMutationKey(productId: string) {
  return ["wishlist", "set-state", productId] as const;
}

function isWishlistMembership(value: unknown): value is WishlistMembership {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.authenticated === "boolean" &&
    Array.isArray(candidate.productIds) &&
    candidate.productIds.every((productId) => typeof productId === "string")
  );
}

export async function fetchWishlistMembership({
  signal,
}: {
  signal?: AbortSignal;
} = {}): Promise<WishlistMembership> {
  const response = await fetch("/api/wishlist/membership", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) throw new Error("Wishlist membership request failed.");

  const membership: unknown = await response.json();
  if (!isWishlistMembership(membership)) {
    throw new Error("Invalid Wishlist membership response.");
  }

  return membership;
}

export function wishlistMembershipQueryOptions() {
  return queryOptions({
    queryKey: wishlistMembershipQueryKey,
    queryFn: ({ signal }) => fetchWishlistMembership({ signal }),
  });
}

export function updateWishlistMembership(
  membership: WishlistMembership,
  productId: string,
  wishlisted: boolean,
): WishlistMembership {
  const productIds = membership.productIds.filter((id) => id !== productId);

  return {
    ...membership,
    productIds: wishlisted ? [...productIds, productId] : productIds,
  };
}
