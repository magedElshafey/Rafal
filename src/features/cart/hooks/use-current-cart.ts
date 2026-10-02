import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";

import {
  currentCartDisplayData,
  currentCartQueryKey,
  currentCartQueryOptions,
  hasCartProjection,
  overlayCurrentCart,
} from "@/features/cart/api/cart-query";
import type { CartSnapshot } from "@/features/cart/types/cart.types";

export function useCurrentCart(
  locale: Locale,
  cityId: number | null = null,
  initialData?: CartSnapshot,
) {
  const client = useQueryClient();
  const query = useQuery({
    ...currentCartQueryOptions(locale, cityId),
    initialData: cityId === null || hasCartProjection(initialData, cityId) ? initialData : undefined,
    // Legacy poisoned entries must not inherit the provider's freshness window.
    refetchOnMount: (entry) => entry.state.isInvalidated ||
      (cityId !== null && !hasCartProjection(entry.state.data, cityId)) ? "always" : true,
    notifyOnChangeProps: "all",
  });
  // Observe optimistic/canonical changes without issuing a second read.
  useQuery({ ...currentCartQueryOptions(locale, null), enabled: false, notifyOnChangeProps: "all" });
  const invalidated = client.getQueryState(currentCartQueryKey(locale, cityId))?.isInvalidated;
  const projectionReady = cityId === null || (
    hasCartProjection(query.data, cityId) && !query.isError && !invalidated && !query.isFetching
  );
  const serverFallback = cityId !== null && !hasCartProjection(query.data, cityId) &&
    hasCartProjection(initialData, cityId) ? initialData : undefined;
  return {
    ...query,
    projectedCart: serverFallback ?? query.data,
    data: serverFallback ? overlayCurrentCart(client, locale, serverFallback) :
      currentCartDisplayData(client, locale, cityId) ?? initialData,
    projectionReady,
    projectionFetching: cityId !== null && (query.isFetching || query.isPending),
  };
}
