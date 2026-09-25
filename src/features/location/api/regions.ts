import type { City } from "@/features/location/types";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";
export type CityDto = {
  id: number;
  region_id: number;
  name: string;
  is_active: boolean;
};
export type RegionDto = {
  id: number;
  name: string;
  cities: readonly CityDto[];
};
export type RegionsResponseDto = {
  success: boolean;
  message: string;
  data: readonly RegionDto[];
};

class RegionsContractError extends Error {
  constructor(path: string, expected: string) {
    super(`Invalid Regions API payload at "${path}": expected ${expected}.`);
    this.name = "RegionsContractError";
  }
}
const { parseArray, parseBoolean, parseRecord, parseString } =
  createRuntimeValidators(
    (path, expected) => new RegionsContractError(path, expected),
  );

function positiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0)
    throw new RegionsContractError(path, "a positive integer");
  return value;
}

function parseCity(value: unknown, path: string): CityDto {
  const source = parseRecord(value, path);
  return {
    id: positiveInteger(source.id, `${path}.id`),
    region_id: positiveInteger(source.region_id, `${path}.region_id`),
    name: parseString(source.name, `${path}.name`),
    is_active: parseBoolean(source.is_active, `${path}.is_active`),
  };
}

export function parseRegionsResponse(value: unknown): RegionsResponseDto {
  const source = parseRecord(value, "response");
  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
    data: parseArray(source.data, "response.data").map((regionValue, index) => {
      const path = `response.data[${index}]`;
      const region = parseRecord(regionValue, path);
      return {
        id: positiveInteger(region.id, `${path}.id`),
        name: parseString(region.name, `${path}.name`),
        cities: parseArray(region.cities, `${path}.cities`).map(
          (city, cityIndex) => parseCity(city, `${path}.cities[${cityIndex}]`),
        ),
      };
    }),
  };
}

export function mapCityDto(city: CityDto): City {
  return {
    id: city.id,
    regionId: city.region_id,
    name: city.name,
  };
}
