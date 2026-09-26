import "server-only";

import type { Locale } from "next-intl";
import { cache } from "react";

import {
  mapCityDto,
  parseRegionsResponse,
} from "@/features/location/api/regions";
import type { City, ResolvedLocation } from "@/features/location/types";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";
import { serverApi } from "@/lib/api/server-api";

class ResolveLocationContractError extends Error {
  constructor(path: string, expected: string) {
    super(`Invalid Location Resolution API payload at "${path}": expected ${expected}.`);
    this.name = "ResolveLocationContractError";
  }
}

const { parseBoolean, parseNullableString, parseRecord, parseString } =
  createRuntimeValidators(
    (path, expected) => new ResolveLocationContractError(path, expected),
  );

function positiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ResolveLocationContractError(path, "a positive integer");
  }
  return value;
}

export async function getCities(locale: Locale): Promise<readonly City[]> {
  const payload = await serverApi.request<unknown>({
    path: "/regions",
    headers: { "Accept-Language": locale },
  });

  return parseRegionsResponse(payload).data.flatMap((region) =>
    region.cities.map(mapCityDto),
  );
}

export const resolveLocationByCityId = cache(async function resolveLocationByCityId(
  cityId: number,
  locale: Locale,
): Promise<ResolvedLocation> {
  const payload = await serverApi.request<unknown, { city_id: number }>({
    path: "/locations/resolve",
    method: "POST",
    headers: { "Accept-Language": locale },
    body: { city_id: cityId },
  });
  const response = parseRecord(payload, "response");
  parseBoolean(response.success, "response.success");
  parseString(response.message, "response.message");
  const data = parseRecord(response.data, "response.data");
  const city = parseRecord(data.city, "response.data.city");
  const region = parseRecord(data.region, "response.data.region");

  return {
    city: {
      id: positiveInteger(city.id, "response.data.city.id"),
      name: parseString(city.name, "response.data.city.name"),
      regionId: positiveInteger(region.id, "response.data.region.id"),
    },
    inCoverage: parseBoolean(data.in_coverage, "response.data.in_coverage"),
    message: parseNullableString(data.message, "response.data.message"),
    region: {
      id: positiveInteger(region.id, "response.data.region.id"),
      name: parseString(region.name, "response.data.region.name"),
    },
    warehouseId: positiveInteger(
      data.warehouse_id,
      "response.data.warehouse_id",
    ),
  };
});
