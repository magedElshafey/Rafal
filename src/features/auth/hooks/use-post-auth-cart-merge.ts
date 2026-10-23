"use client";

import { useCallback, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";

import { mergeCartAfterAuth } from "@/features/cart/actions/merge-cart-after-auth";
import { beginRecommendationTransition } from "@/features/cart/api/cart-recommendation-lifecycle";
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
    const recommendationTransition = beginRecommendationTransition(queryClient);
    try {
      await recommendationTransition.ready;
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
    } finally {
      recommendationTransition.finish();
    }
  }, [locale, queryClient, returnTo, router]);

  const retryMerge = () => {
    startRetryTransition(async () => mergeAndContinue());
  };

  return { mergeAndContinue, retryMerge, retryPending };
}
