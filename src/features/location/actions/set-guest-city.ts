"use server";

import { cookies } from "next/headers";

import { GUEST_CITY_COOKIE_NAME } from "@/features/location/constants";

const MAX_CITY_ID_LENGTH = 128;

export async function setGuestCityId(cityId: string) {
  if (
    typeof cityId !== "string" ||
    cityId.trim().length === 0 ||
    cityId.length > MAX_CITY_ID_LENGTH
  ) {
    throw new TypeError("Invalid city ID");
  }

  const cookieStore = await cookies();
  cookieStore.set(GUEST_CITY_COOKIE_NAME, cityId, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
