import type { Locale } from "next-intl";

import { mapCityDto, parseRegionsResponse } from "@/features/location/api/regions";
import type { City } from "@/features/location/types";
import { createClientApi } from "@/lib/api/client-api";

export async function getCitiesClient(locale: Locale): Promise<readonly City[]> {
  const payload = await createClientApi(locale).request<unknown>({ path: "/regions" });
  return parseRegionsResponse(payload).data.flatMap((region) => region.cities.map(mapCityDto));
}
