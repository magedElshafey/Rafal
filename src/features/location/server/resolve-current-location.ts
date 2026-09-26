import "server-only";

import type { Locale } from "next-intl";
import { cache } from "react";

import { getCities } from "@/features/location/api/location-api.server";
import { readGuestCityId } from "@/features/location/server/guest-city-session";
import type { City } from "@/features/location/types";

const getCityCatalog = cache(getCities);

export async function resolveCurrentLocation(
  locale: Locale,
): Promise<City | null> {
  const numericCityId = await readGuestCityId();
  if (numericCityId === null) return null;
  return (
    (await getCityCatalog(locale)).find((city) => city.id === numericCityId) ??
    null
  );
}
