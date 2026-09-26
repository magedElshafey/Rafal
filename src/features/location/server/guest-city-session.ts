import "server-only";

import { cookies } from "next/headers";

import { GUEST_CITY_COOKIE_NAME } from "@/features/location/constants";

export async function readGuestCityId(): Promise<number | null> {
  const cityId = (await cookies()).get(GUEST_CITY_COOKIE_NAME)?.value;
  if (!cityId || !/^[1-9]\d*$/.test(cityId)) return null;

  const numericCityId = Number(cityId);
  return Number.isSafeInteger(numericCityId) ? numericCityId : null;
}
