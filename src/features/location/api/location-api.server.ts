import "server-only";

import {
  mapCityDto,
  parseRegionsResponse,
} from "@/features/location/api/regions";
import type { City } from "@/features/location/types";
import { serverApi } from "@/lib/api/server-api";

export async function getCities(): Promise<readonly City[]> {
  const payload = await serverApi.request<unknown>({ path: "/regions" });

  return parseRegionsResponse(payload).data.flatMap((region) =>
    region.cities.map(mapCityDto),
  );
}

