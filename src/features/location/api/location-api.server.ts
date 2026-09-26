import "server-only";

import type { Locale } from "next-intl";

import {
  mapCityDto,
  parseRegionsResponse,
} from "@/features/location/api/regions";
import type { City } from "@/features/location/types";
import { serverApi } from "@/lib/api/server-api";

export async function getCities(locale: Locale): Promise<readonly City[]> {
  const payload = await serverApi.request<unknown>({
    path: "/regions",
    headers: { "Accept-Language": locale },
  });

  return parseRegionsResponse(payload).data.flatMap((region) =>
    region.cities.map(mapCityDto),
  );
}
