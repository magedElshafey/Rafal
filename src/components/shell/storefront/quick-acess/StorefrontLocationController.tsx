"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";

import { invalidateCurrentCartQueries } from "@/features/cart/api/cart-query";
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
      onLocationPersisted={() => invalidateCurrentCartQueries(queryClient)}
    />
  );
}
