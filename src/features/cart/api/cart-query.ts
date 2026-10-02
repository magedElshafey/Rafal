import {
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query";
import type { Locale } from "next-intl";

import type { CartSnapshot } from "@/features/cart/types/cart.types";
import { ApiError } from "@/lib/api/api-error";

export const currentCartQueryKeyRoot = ["cart", "current"] as const;

// Holds callbacks only; the QueryClient remains the sole Cart snapshot store.
type CartWriteOverlay = {
  overlay: (cart: CartSnapshot) => CartSnapshot;
  canonicalChanged: () => void;
};
const cartWriteOverlays = new WeakMap<QueryClient, Map<Locale, CartWriteOverlay>>();

export function registerCartWriteOverlay(
  client: QueryClient,
  locale: Locale,
  callbacks: CartWriteOverlay,
) {
  const entries = cartWriteOverlays.get(client) ?? new Map<Locale, CartWriteOverlay>();
  cartWriteOverlays.set(client, entries);
  entries.set(locale, callbacks);
  return () => {
    if (entries.get(locale) === callbacks) entries.delete(locale);
  };
}

export function currentCartQueryKey(locale: Locale, cityId: number | null) {
  return [...currentCartQueryKeyRoot, locale, cityId] as const;
}

export function hasCartProjection(cart: CartSnapshot | undefined, cityId: number): boolean {
  return !!cart && cart.lines.every((line) => line.availability?.cityId === cityId);
}

export function overlayCurrentCart(client: QueryClient, locale: Locale, cart: CartSnapshot) {
  return cartWriteOverlays.get(client)?.get(locale)?.overlay(cart) ?? cart;
}

export function currentCartDisplayData(client: QueryClient, locale: Locale, cityId: number | null) {
  const projection = client.getQueryState<CartSnapshot>(currentCartQueryKey(locale, cityId));
  const canonical = client.getQueryData<CartSnapshot>(currentCartQueryKey(locale, null));
  const cart = projection?.isInvalidated ? canonical ?? projection.data : projection?.data ?? canonical;
  return cart ? overlayCurrentCart(client, locale, cart) : undefined;
}

async function fetchCurrentCart({
  locale,
  cityId,
  signal,
}: {
  locale: Locale;
  cityId: number | null;
  signal?: AbortSignal;
}): Promise<CartSnapshot> {
  const searchParams = new URLSearchParams({ locale });
  if (cityId !== null) searchParams.set("cityId", String(cityId));
  const response = await fetch(`/api/cart?${searchParams}`, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new ApiError({ status: response.status, message: "Current Cart request failed." });
  }

  return response.json() as Promise<CartSnapshot>;
}

export function currentCartQueryOptions(
  locale: Locale,
  cityId: number | null,
) {
  return queryOptions({
    queryKey: currentCartQueryKey(locale, cityId),
    queryFn: async ({ signal, client }) => {
      const cart = await fetchCurrentCart({ locale, cityId, signal });
      if (cityId !== null) {
        if (!hasCartProjection(cart, cityId)) {
          throw new ApiError({ status: 502, code: "invalid-cart-projection", message: "Cart availability could not be confirmed." });
        }
        // Only the actual, validated GET response belongs in this projection key.
        return cart;
      }
      return overlayCurrentCart(client, locale, cart);
    },
    // Includes imperative fetchQuery callers, not only mounted Cart observers.
    staleTime: (entry) => cityId !== null && !hasCartProjection(entry.state.data, cityId) ? 0 : 30_000,
  });
}

export function setCurrentCartQueryData(
  queryClient: QueryClient,
  locale: Locale,
  cart: CartSnapshot,
) {
  const callbacks = cartWriteOverlays.get(queryClient)?.get(locale);
  const projections = {
    queryKey: [...currentCartQueryKeyRoot, locale],
    predicate: (query: { queryKey: readonly unknown[] }) => typeof query.queryKey[3] === "number",
  };
  // This runs for PDP and other writers even with no CartPage mounted.
  void queryClient.cancelQueries(projections);
  callbacks?.canonicalChanged();
  // Mutation responses do not establish a fresh destination-city projection.
  const canonical = {
    ...cart,
    lines: cart.lines.map((line) => {
      const next = { ...line };
      delete next.availability;
      return next;
    }),
  };
  const next = callbacks?.overlay(canonical) ?? canonical;

  queryClient.setQueryData(currentCartQueryKey(locale, null), next);
  void queryClient.invalidateQueries({ ...projections, refetchType: callbacks ? "none" : "active" });
}

export function updateCurrentCartQueryData(
  queryClient: QueryClient,
  locale: Locale,
  cityId: number | null,
  updater: (cart: CartSnapshot) => CartSnapshot,
) {
  const current = currentCartDisplayData(queryClient, locale, cityId);
  queryClient.setQueryData<CartSnapshot>(
    currentCartQueryKey(locale, null),
    current ? updater(current) : undefined,
  );
  if (cityId !== null) void queryClient.invalidateQueries({
    queryKey: currentCartQueryKey(locale, cityId), exact: true, refetchType: "none",
  });
}

export function invalidateCurrentCartQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: currentCartQueryKeyRoot,
  });
}

export function removeCurrentCartQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: currentCartQueryKeyRoot });
}
