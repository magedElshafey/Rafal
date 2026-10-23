"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { ApiError } from "@/lib/api/api-error";
import { reconcileRecommendationCart } from "../api/cart-query";
import { cartRecommendationsQueryOptions, removeCartRecommendations } from "../api/cart-recommendations-query";
import {
  canReconcileRecommendations, getRecommendationGate, initialRecommendationGate,
  isRecommendationGenerationCurrent, recommendationGateKey, recommendationReconciliationKey,
  suspendRecommendationReads,
} from "../api/cart-recommendation-lifecycle";

export function useCartRecommendations({ locale, accountId, browsingCityId, fulfillmentCityId, contextReady, projectionReady, empty }: {
  locale: Locale; accountId: string | null; browsingCityId: number | null;
  fulfillmentCityId: number | null; contextReady: boolean; projectionReady: boolean; empty: boolean;
}) {
  const client = useQueryClient();
  const { data: gate } = useQuery({ queryKey: recommendationGateKey,
    queryFn: () => getRecommendationGate(client), initialData: initialRecommendationGate,
    enabled: false, gcTime: Infinity });
  const eligible = canReconcileRecommendations(gate) && contextReady && !empty && fulfillmentCityId !== null;
  const generation = gate.generation;
  const current = () => isRecommendationGenerationCurrent(client, generation);
  const reconciliation = useQuery({
    queryKey: [...recommendationReconciliationKey, locale, accountId, browsingCityId, fulfillmentCityId, generation],
    enabled: eligible,
    queryFn: async ({ signal }) => {
      const result = await reconcileRecommendationCart(locale, fulfillmentCityId!, signal, accountId);
      // Props are a consistency constraint, never sufficient authentication evidence.
      if (!current() || signal.aborted || result.accountId !== accountId) {
        throw new ApiError({ status: 401, code: "account-unconfirmed", message: "Cart account could not be confirmed." });
      }
      return result;
    },
    retry: false, staleTime: Infinity, gcTime: 0, refetchOnWindowFocus: false,
  });
  const confirmed = eligible && reconciliation.isSuccess && reconciliation.data.cart.lines.length > 0;
  const recommendations = useQuery({
    ...cartRecommendationsQueryOptions({ accountId: reconciliation.data?.accountId ?? null,
      locale, browsingCityId, fulfillmentCityId }, { generation, current }),
    enabled: confirmed && projectionReady,
    staleTime: Infinity,
  });
  useEffect(() => {
    if (!contextReady) void suspendRecommendationReads(client);
  }, [client, contextReady]);
  useEffect(() => () => { void suspendRecommendationReads(client); }, [client]);
  useEffect(() => {
    if (empty) void removeCartRecommendations(client);
  }, [client, empty]);

  if (!eligible || !projectionReady) return { status: "inactive" } as const;
  if (reconciliation.isError || recommendations.isError) return { status: "error" } as const;
  if (reconciliation.isSuccess && !reconciliation.data.cart.lines.length) return { status: "inactive" } as const;
  if (confirmed && recommendations.data?.generation === generation && !recommendations.isFetching) {
    return { status: "success", data: recommendations.data } as const;
  }
  return { status: "loading" } as const;
}
