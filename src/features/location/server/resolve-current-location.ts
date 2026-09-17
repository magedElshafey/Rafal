import "server-only";

import type { Locale } from "next-intl";
import { cookies } from "next/headers";

import { GUEST_CITY_COOKIE_NAME } from "@/features/location/constants";
import { cityService } from "@/features/location/services/city-service";
import type { City } from "@/features/location/types";

export async function resolveCurrentLocation(
  locale: Locale,
): Promise<City | null> {
  const cookieStore = await cookies();
  const cityId = cookieStore.get(GUEST_CITY_COOKIE_NAME)?.value;

  return cityId ? cityService.getCityById(cityId, locale) : null;
}
