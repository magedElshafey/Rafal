"use server";

import { cookies } from "next/headers";

import { serverEnv } from "@/config/server-env";
import { GUEST_CITY_COOKIE_NAME } from "@/features/location/constants";

const MAX_CITY_ID_LENGTH = 128;

export async function setGuestCityId(cityId: string | number) {
  const validMockId =
    typeof cityId === "string" &&
    cityId.trim().length > 0 &&
    cityId.length <= MAX_CITY_ID_LENGTH;
  const validLaravelId =
    typeof cityId === "number" &&
    Number.isSafeInteger(cityId) &&
    cityId > 0;
  if (serverEnv.useMockApi ? !validMockId : !validLaravelId) {
    throw new TypeError("Invalid city ID");
  }

  const cookieStore = await cookies();
  cookieStore.set(GUEST_CITY_COOKIE_NAME, String(cityId), {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
