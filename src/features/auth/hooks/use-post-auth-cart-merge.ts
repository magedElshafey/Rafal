"use client";

import { useCallback, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";

import { mergeCartAfterAuth } from "@/features/cart/actions/merge-cart-after-auth";
import {
  invalidateCurrentCartQueries,
  setCurrentCartQueryData,
} from "@/features/cart/api/cart-query";
import { useRouter } from "@/i18n/navigation";

export function usePostAuthCartMerge(locale: Locale, returnTo: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [retryPending, startRetryTransition] = useTransition();

  const mergeAndContinue = useCallback(async () => {
    try {
      const result = await mergeCartAfterAuth(locale);
      if (!result.ok) {
        router.replace({
          pathname: "/auth/cart-recovery",
          query: { returnTo },
        });
        return;
      }

      if (result.merged) {
        setCurrentCartQueryData(queryClient, locale, result.cart);
      } else {
        await invalidateCurrentCartQueries(queryClient);
      }
      router.replace(returnTo);
    } catch {
      router.replace({
        pathname: "/auth/cart-recovery",
        query: { returnTo },
      });
    }
  }, [locale, queryClient, returnTo, router]);

  const retryMerge = () => {
    startRetryTransition(async () => mergeAndContinue());
  };

  return { mergeAndContinue, retryMerge, retryPending };
}
