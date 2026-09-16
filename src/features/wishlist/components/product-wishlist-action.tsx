"use client";

import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { ProductCardWishlistButton } from "@/features/products/components/product-card";
import { getSafeInternalReturnTo } from "@/features/auth/utils/safe-return-to";
import { setWishlistState } from "@/features/wishlist/actions/set-wishlist-state";
import {
  updateWishlistMembership,
  wishlistMembershipQueryKey,
  wishlistMutationKey,
} from "@/features/wishlist/api/wishlist-membership";
import { useWishlistProductMembership } from "@/features/wishlist/hooks/use-wishlist-product-membership";
import type { WishlistMembership } from "@/features/wishlist/types/wishlist.types";
import { usePathname, useRouter } from "@/i18n/navigation";
import { rafalToast } from "@/lib/rafal-toast";

type ProductWishlistActionProps = {
  productId: string;
};

export function ProductWishlistAction({
  productId,
}: ProductWishlistActionProps) {
  const t = useTranslations("Common.wishlistAction");
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const membershipQuery = useWishlistProductMembership(productId);
  const pendingForProduct =
    useIsMutating({
      mutationKey: wishlistMutationKey(productId),
      exact: true,
    }) > 0;
  const mutation = useMutation({
    mutationKey: wishlistMutationKey(productId),
    // Temporary: cookie-backed mock read-modify-write operations are not
    // atomic. Review this global serialization when Laravel owns persistence.
    scope: { id: "wishlist-mutations" },
    mutationFn: async (wishlisted: boolean) => {
      const result = await setWishlistState({ productId, wishlisted });
      if (!result.ok) throw new Error("Wishlist mutation failed.");
      return wishlisted;
    },
    onMutate: async (wishlisted) => {
      await queryClient.cancelQueries({ queryKey: wishlistMembershipQueryKey });
      const membership = queryClient.getQueryData<WishlistMembership>(
        wishlistMembershipQueryKey,
      );
      const previousWishlisted =
        membership?.productIds.includes(productId) ?? false;

      if (membership?.authenticated) {
        queryClient.setQueryData(
          wishlistMembershipQueryKey,
          updateWishlistMembership(membership, productId, wishlisted),
        );
      }

      return { previousWishlisted };
    },
    onError: (_error, _wishlisted, context) => {
      const membership = queryClient.getQueryData<WishlistMembership>(
        wishlistMembershipQueryKey,
      );
      if (membership?.authenticated && context) {
        queryClient.setQueryData(
          wishlistMembershipQueryKey,
          updateWishlistMembership(
            membership,
            productId,
            context.previousWishlisted,
          ),
        );
      }
      rafalToast.error(t("error"));
    },
  });
  const membership = membershipQuery.data;
  const stateKnown = membershipQuery.isSuccess;
  const wishlisted = membership?.wishlisted ?? false;
  const pending = pendingForProduct || mutation.isPending;
  const label = !stateKnown
    ? membershipQuery.isError
      ? t("unavailable")
      : t("loading")
    : pending
      ? t("pending")
      : wishlisted
        ? t("remove")
        : t("add");

  const handleClick = () => {
    if (!stateKnown || pending || !membership) return;

    if (!membership.authenticated) {
      const returnTo = getSafeInternalReturnTo(
        `${pathname}${window.location.search}${window.location.hash}`,
        "/",
      );
      router.push({ pathname: "/login", query: { returnTo } });
      return;
    }

    mutation.mutate(!wishlisted);
  };

  return (
    <ProductCardWishlistButton
      aria-busy={membershipQuery.isPending || pending || undefined}
      aria-pressed={stateKnown ? wishlisted : undefined}
      disabled={!stateKnown || pending}
      label={label}
      onClick={handleClick}
    />
  );
}
