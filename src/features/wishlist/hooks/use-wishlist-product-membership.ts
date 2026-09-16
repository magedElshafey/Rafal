import { useQuery } from "@tanstack/react-query";

import { wishlistMembershipQueryOptions } from "@/features/wishlist/api/wishlist-membership";

export function useWishlistProductMembership(productId: string) {
  return useQuery({
    ...wishlistMembershipQueryOptions(),
    select: (membership) => ({
      authenticated: membership.authenticated,
      wishlisted: membership.productIds.includes(productId),
    }),
  });
}
