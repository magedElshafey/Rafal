import "server-only";

import { mapCityDto, parseCitiesResponse, parseRegionsResponse } from "@/features/location/api/regions";
import type { LaravelCity } from "@/features/location/types";
import { serverApi } from "@/lib/api/server-api";

export async function getLaravelCities(): Promise<readonly LaravelCity[]> {
  const payload = await serverApi.request<unknown>({ path: "/regions" });
  return parseRegionsResponse(payload).data.flatMap((region) => region.cities.map(mapCityDto));
}

export async function getLaravelRegionCities(regionId: number): Promise<readonly LaravelCity[]> {
  const payload = await serverApi.request<unknown>({ path: `/regions/${regionId}/cities` });
  return parseCitiesResponse(payload).map(mapCityDto);
}
