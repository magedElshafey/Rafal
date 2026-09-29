import { queryOptions } from "@tanstack/react-query";
import type { Locale } from "next-intl";

import { getCitiesClient } from "@/features/location/api/location-api.client";

export function cityCatalogQueryKey(locale: Locale) {
  return ["location", "cities", locale] as const;
}

export function cityCatalogQueryOptions(locale: Locale) {
  return queryOptions({
    queryKey: cityCatalogQueryKey(locale),
    queryFn: ({ signal }) => getCitiesClient(locale, signal),
    retry: false,
    staleTime: 5 * 60_000,
  });
}
