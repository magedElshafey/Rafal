"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { getSafeInternalReturnTo } from "@/features/auth/utils/safe-return-to";
import { wishlistQueryKeys } from "@/features/wishlist/api/wishlist-query-keys";
import { usePathname, useRouter } from "@/i18n/navigation";

export function useWishlistSessionExpiry(accountId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const expiredRef = useRef(false);
  const [expired, setExpired] = useState(false);
  const handleUnauthorized = useCallback(() => {
    if (expiredRef.current) return;
    expiredRef.current = true;
    setExpired(true);
    const returnTo = getSafeInternalReturnTo(
      `${pathname}${window.location.search}${window.location.hash}`,
    );
    const queryKey = wishlistQueryKeys.account(accountId);
    void queryClient.cancelQueries({ queryKey }).then(() => {
      queryClient.removeQueries({ queryKey });
      router.replace({
        pathname: "/login",
        query: { returnTo, state: "session-expired" },
      });
    });
  }, [accountId, pathname, queryClient, router]);

  return { expired, expiredRef, handleUnauthorized };
}
