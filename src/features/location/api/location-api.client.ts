import type { Locale } from "next-intl";

import { mapCityDto, parseRegionsResponse } from "@/features/location/api/regions";
import type { LaravelCity } from "@/features/location/types";
import { createClientApi } from "@/lib/api/client-api";

export async function getLaravelCitiesClient(locale: Locale): Promise<readonly LaravelCity[]> {
  const payload = await createClientApi(locale).request<unknown>({ path: "/regions" });
  return parseRegionsResponse(payload).data.flatMap((region) => region.cities.map(mapCityDto));
}
