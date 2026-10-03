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
  browsingCityId: number | null = null,
  initialData?: CartSnapshot,
) {
  const client = useQueryClient();
  // Observe canonical mutations without issuing a second read. Persisted Gift
  // state, never an editor draft, owns the Cart's effective destination.
  const canonicalQuery = useQuery({
    ...currentCartQueryOptions(locale, null),
    enabled: false,
    notifyOnChangeProps: "all",
  });
  const canonicalCart = canonicalQuery.data ?? initialData;
  const giftRecipient = canonicalCart?.gift.isGift
    ? canonicalCart.gift.recipient
    : null;
  const fulfillmentCityId = giftRecipient?.city.id ?? browsingCityId;
  const query = useQuery({
    ...currentCartQueryOptions(locale, fulfillmentCityId),
    initialData: fulfillmentCityId === null || hasCartProjection(initialData, fulfillmentCityId)
      ? initialData
      : undefined,
    // Legacy poisoned entries must not inherit the provider's freshness window.
    refetchOnMount: (entry) => entry.state.isInvalidated ||
      (fulfillmentCityId !== null && !hasCartProjection(entry.state.data, fulfillmentCityId))
      ? "always"
      : true,
    notifyOnChangeProps: "all",
  });
  const invalidated = client.getQueryState(
    currentCartQueryKey(locale, fulfillmentCityId),
  )?.isInvalidated;
  const projectionReady = fulfillmentCityId === null || (
    hasCartProjection(query.data, fulfillmentCityId) &&
    !query.isError &&
    !invalidated &&
    !query.isFetching
  );
  const serverFallback = fulfillmentCityId !== null &&
    !hasCartProjection(query.data, fulfillmentCityId) &&
    hasCartProjection(initialData, fulfillmentCityId)
    ? initialData
    : undefined;
  const projectedCart = fulfillmentCityId !== null &&
    hasCartProjection(query.data, fulfillmentCityId)
    ? query.data
    : serverFallback;
  return {
    ...query,
    projectedCart,
    data: serverFallback ? overlayCurrentCart(client, locale, serverFallback) :
      currentCartDisplayData(client, locale, fulfillmentCityId) ?? initialData,
    fulfillmentCityId,
    usesGiftFulfillment: giftRecipient !== null,
    projectionReady,
    projectionFetching: fulfillmentCityId !== null && (query.isFetching || query.isPending),
  };
}
