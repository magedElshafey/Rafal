"use server";

import { cookies } from "next/headers";

import { GUEST_CITY_COOKIE_NAME } from "@/features/location/constants";

export async function setGuestCityId(cityId: number) {
  if (!Number.isSafeInteger(cityId) || cityId <= 0) {
    throw new TypeError("Invalid city ID");
  }

  const cookieStore = await cookies();

  cookieStore.set(GUEST_CITY_COOKIE_NAME, String(cityId), {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
