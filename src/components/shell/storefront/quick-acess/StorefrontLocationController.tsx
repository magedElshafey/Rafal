"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";

import { currentCartQueryKey, currentCartQueryOptions } from "@/features/cart/api/cart-query";
import { notifyBrowsingCitySelected } from "@/features/location/browsing-city-events";
import {
  LocationController,
  type LocationControllerCopy,
} from "@/features/location/components/LocationController";
import type { City } from "@/features/location/types";

type StorefrontLocationControllerProps = {
  copy: LocationControllerCopy;
  initialCity: City | null;
  locale: Locale;
};

export function StorefrontLocationController({
  copy,
  initialCity,
  locale,
}: StorefrontLocationControllerProps) {
  const queryClient = useQueryClient();

  return (
    <LocationController
      copy={copy}
      initialCity={initialCity}
      locale={locale}
      onLocationSelected={(city) => notifyBrowsingCitySelected(city.id)}
      onLocationPersisted={async (city) => {
        await queryClient.cancelQueries({ queryKey: currentCartQueryKey(locale, city.id), exact: true });
        await queryClient
          .fetchQuery({ ...currentCartQueryOptions(locale, city.id), staleTime: 0 })
          .catch(() => undefined);
      }}
    />
  );
}
