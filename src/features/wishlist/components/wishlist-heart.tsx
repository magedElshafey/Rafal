"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { HeartFilledIcon, HeartIcon } from "@/components/ui/icons";
import { getSafeInternalReturnTo } from "@/features/auth/utils/safe-return-to";
import { ProductCardWishlistButton } from "@/features/products/components/product-card/product-card";
import { wishlistQueryKeys } from "@/features/wishlist/api/wishlist-query-keys";
import {
  useWishlistMutation,
  type WishlistChange,
} from "@/features/wishlist/hooks/use-wishlist-mutation";
import { useWishlistSessionExpiry } from "@/features/wishlist/hooks/use-wishlist-session-expiry";
import { usePathname, useRouter } from "@/i18n/navigation";
import { rafalToast } from "@/lib/rafal-toast";

type HeartProps = {
  accountId: string | null;
  productId: string;
  isWishlisted: boolean;
  variant?: "card" | "action";
};

function HeartButton({
  wishlisted,
  pending = false,
  disabled = false,
  onClick,
  variant,
}: {
  wishlisted: boolean;
  pending?: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant: HeartProps["variant"];
}) {
  const t = useTranslations("Account.wishlist");
  const label = t(wishlisted ? "actions.remove" : "actions.add");
  const props = {
    "aria-pressed": wishlisted,
    "aria-busy": pending || undefined,
    disabled: disabled || pending,
    onClick,
  };
  return variant === "action" ? (
    <Button
      {...props}
      variant="outline"
      loading={pending}
      loadingLabel={t("actions.pending")}
    >
      {wishlisted ? (
        <HeartFilledIcon aria-hidden="true" />
      ) : (
        <HeartIcon aria-hidden="true" />
      )}
      {label}
    </Button>
  ) : (
    <ProductCardWishlistButton {...props} label={label} />
  );
}

function GuestHeart(props: HeartProps) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <HeartButton
      variant={props.variant}
      wishlisted={props.isWishlisted}
      onClick={() => router.push({
        pathname: "/login",
        query: {
          returnTo: getSafeInternalReturnTo(
            `${pathname}${window.location.search}${window.location.hash}`,
          ),
        },
      })}
    />
  );
}

function AuthenticatedHeart({
  accountId,
  productId,
  isWishlisted,
  variant,
}: HeartProps & { accountId: string }) {
  const locale = useLocale();
  const t = useTranslations("Account.wishlist");
  const queryClient = useQueryClient();
  const [wishlisted, setWishlisted] = useState(isWishlisted);
  const { expired, expiredRef, handleUnauthorized } =
    useWishlistSessionExpiry(accountId);
  const mutation = useWishlistMutation({
    accountId,
    locale,
    onUnauthorized: handleUnauthorized,
    onFailure: () => rafalToast.error(t("mutationError")),
  });

  useEffect(() => {
    // Share mutation events between mounted copies, without storing membership
    // or fetching it separately. Fresh mounts start from their backend Product.
    const mutationKey = wishlistQueryKeys.mutation(accountId);
    const cache = queryClient.getMutationCache();
    const sync = (entry: ReturnType<typeof cache.getAll>[number]) => {
      if (
        entry.options.mutationKey?.length !== mutationKey.length ||
        !mutationKey.every(
          (part, index) => entry.options.mutationKey?.[index] === part,
        )
      ) return;
      const change = entry.state.variables as WishlistChange | undefined;
      if (change?.productId !== productId) return;
      if (entry.state.status === "pending" || entry.state.status === "success") {
        setWishlisted(change.wishlisted);
      } else if (entry.state.status === "error") {
        setWishlisted(change.previousWishlisted ?? true);
      }
    };
    for (const entry of cache.findAll({ mutationKey, exact: true, status: "pending" })) {
      sync(entry);
    }
    return cache.subscribe((event) => {
      if (event.type === "updated") sync(event.mutation);
    });
  }, [accountId, productId, queryClient]);

  return (
    <HeartButton
      variant={variant}
      wishlisted={wishlisted}
      pending={mutation.isPending}
      disabled={expired}
      onClick={() => {
        if (expiredRef.current) return;
        if (mutation.setState({
          productId,
          wishlisted: !wishlisted,
          previousWishlisted: wishlisted,
        })) {
          setWishlisted(!wishlisted);
        }
      }}
    />
  );
}

export function WishlistHeart(props: HeartProps) {
  return props.accountId === null ? (
    <GuestHeart {...props} />
  ) : (
    <AuthenticatedHeart
      {...props}
      accountId={props.accountId}
      key={`${props.accountId}:${props.productId}:${props.isWishlisted}`}
    />
  );
}
