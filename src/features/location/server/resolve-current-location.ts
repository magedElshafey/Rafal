import "server-only";

import type { Locale } from "next-intl";
import { cache } from "react";
import { cookies } from "next/headers";

import { serverEnv } from "@/config/server-env";
import { getLaravelCities } from "@/features/location/api/location-api.server";
import { GUEST_CITY_COOKIE_NAME } from "@/features/location/constants";
import { MOCK_CITIES } from "@/features/location/data/mock-cities";
import type { City } from "@/features/location/types";

const getLaravelCityCatalog = cache(getLaravelCities);

export async function resolveCurrentLocation(
  locale: Locale,
): Promise<City | null> {
  const cookieStore = await cookies();
  const cityId = cookieStore.get(GUEST_CITY_COOKIE_NAME)?.value;
  if (!cityId) return null;

  if (serverEnv.useMockApi) {
    const city = MOCK_CITIES.find((candidate) => candidate.id === cityId);
    if (!city || !city.isAvailable) return null;
    return {
      source: "mock",
      id: city.id,
      name: city.names[locale],
      isAvailable: true,
    };
  }

  if (!/^[1-9]\d*$/.test(cityId)) return null;
  const numericCityId = Number(cityId);
  if (!Number.isSafeInteger(numericCityId)) return null;
  return (await getLaravelCityCatalog()).find(
    (city) => city.id === numericCityId && city.isAvailable,
  ) ?? null;
}
