import { queryOptions, type QueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import type { CartRecommendations } from "@/features/cart/types/cart-recommendations.types";
import { ApiError } from "@/lib/api/api-error";

export const cartRecommendationsQueryKeyRoot = ["cart", "recommendations"] as const;

// Existing public context only. Cities partition browser data; Laravel resolves
// its own city. Never send these IDs or a cart/session token in this request.
// Consumers wait for city persistence and fresh server-resolved reconciliation.
// Guest contexts use the transition generation, never a browser-readable token.
type RecommendationContext = {
  accountId: string | null;
  locale: Locale;
  browsingCityId: number | null;
  fulfillmentCityId: number | null;
};

export function cartRecommendationsQueryKey(context: RecommendationContext) {
  return [...cartRecommendationsQueryKeyRoot, context] as const;
}

async function fetchCartRecommendations(locale: Locale, accountId: string | null, signal: AbortSignal): Promise<CartRecommendations> {
  const query = new URLSearchParams({ locale });
  const response = await fetch(`/api/cart/recommendations?${query}`, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json", "X-Rafal-Cart-Mode": accountId === null ? "guest" : "authenticated" },
    signal,
  });
  if (!response.ok) {
    throw new ApiError({ status: response.status, code: "recommendations-unavailable", message: "Cart recommendations could not be loaded." });
  }
  if (response.headers.get("X-Rafal-Account-Id") !== accountId ||
    (accountId === null ? response.headers.get("X-Rafal-Cart-Mode") !== "guest" : response.headers.get("X-Rafal-Cart-Mode") === "guest")) {
    throw new ApiError({ status: 401, code: "account-unconfirmed", message: "Recommendation account could not be confirmed." });
  }
  return response.json();
}

export function cartRecommendationsQueryOptions(context: RecommendationContext, guard?: { generation: number; current: () => boolean }) {
  return queryOptions({
    queryKey: cartRecommendationsQueryKey(context),
    queryFn: async ({ signal }): Promise<CartRecommendations & { generation?: number }> => {
      const assertCurrent = () => {
        if (signal.aborted || (guard && !guard.current())) throw new ApiError({ status: 409, code: "recommendation-context-changed", message: "Recommendation context changed." });
      };
      assertCurrent();
      const data = await fetchCartRecommendations(context.locale, context.accountId, signal);
      assertCurrent();
      return guard ? { ...data, generation: guard.generation } : data;
    },
    // Do not retain private data after the last consumer unmounts. Remounts
    // confirm backend context; the backend still owns recommendation persistence.
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// Explicit successful add/remove integration only; not called by generic Cart writers.
export async function invalidateCartRecommendations(client: QueryClient) {
  await client.cancelQueries({ queryKey: cartRecommendationsQueryKeyRoot });
  return client.invalidateQueries({ queryKey: cartRecommendationsQueryKeyRoot });
}

// The lifecycle gate uses this during transitions. Public accountId is account
// evidence, not session identity; generation checks also reject late results.
export async function removeCartRecommendations(client: QueryClient) {
  await client.cancelQueries({ queryKey: cartRecommendationsQueryKeyRoot });
  client.removeQueries({ queryKey: cartRecommendationsQueryKeyRoot });
}
