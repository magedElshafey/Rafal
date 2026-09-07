import { GUEST_CITY_COOKIE_NAME } from "@/features/location/constants";

export function writeGuestCityId(cityId: string) {
  document.cookie = `${GUEST_CITY_COOKIE_NAME}=${encodeURIComponent(cityId)}; Path=/; SameSite=Lax`;
}
