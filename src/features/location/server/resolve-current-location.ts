import "server-only";

import type { Locale } from "next-intl";
import { cache } from "react";
import { cookies } from "next/headers";

import { getCities } from "@/features/location/api/location-api.server";
import { GUEST_CITY_COOKIE_NAME } from "@/features/location/constants";
import type { City } from "@/features/location/types";

const getCityCatalog = cache(getCities);

export async function resolveCurrentLocation(
  locale: Locale,
): Promise<City | null> {
  // Keep existing callers compatible; serverApi resolves the request locale.
  void locale;
  const cookieStore = await cookies();
  const cityId = cookieStore.get(GUEST_CITY_COOKIE_NAME)?.value;
  if (!cityId) return null;

  if (!/^[1-9]\d*$/.test(cityId)) return null;
  const numericCityId = Number(cityId);
  if (!Number.isSafeInteger(numericCityId)) return null;
  return (
    (await getCityCatalog()).find((city) => city.id === numericCityId) ?? null
  );
}
