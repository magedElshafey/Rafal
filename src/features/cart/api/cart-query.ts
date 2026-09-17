import {
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query";
import type { Locale } from "next-intl";

import type { CartSnapshot } from "@/features/cart/types/cart.types";

export const currentCartQueryKeyRoot = ["cart", "current"] as const;

export function currentCartQueryKey(locale: Locale) {
  return [...currentCartQueryKeyRoot, locale] as const;
}

async function fetchCurrentCart({
  locale,
  signal,
}: {
  locale: Locale;
  signal?: AbortSignal;
}): Promise<CartSnapshot> {
  const searchParams = new URLSearchParams({ locale });
  const response = await fetch(`/api/cart?${searchParams}`, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) throw new Error("Current Cart request failed.");

  return response.json() as Promise<CartSnapshot>;
}

export function currentCartQueryOptions(locale: Locale) {
  return queryOptions({
    queryKey: currentCartQueryKey(locale),
    queryFn: ({ signal }) => fetchCurrentCart({ locale, signal }),
  });
}

export function setCurrentCartQueryData(
  queryClient: QueryClient,
  locale: Locale,
  cart: CartSnapshot,
) {
  queryClient.setQueryData(currentCartQueryKey(locale), cart);
}

export function invalidateCurrentCartQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: currentCartQueryKeyRoot,
  });
}

export function removeCurrentCartQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: currentCartQueryKeyRoot });
}
