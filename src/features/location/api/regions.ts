import type { LaravelCity } from "@/features/location/types";

export type CityDto = { id: number; region_id: number; name: string; is_active: boolean };
export type RegionDto = { id: number; name: string; cities: readonly CityDto[] };
export type RegionsResponseDto = { success: boolean; message: string; data: readonly RegionDto[] };

class RegionsContractError extends Error {
  constructor(path: string, expected: string) {
    super(`Invalid Regions API payload at "${path}": expected ${expected}.`);
    this.name = "RegionsContractError";
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new RegionsContractError(path, "an object");
  return value as Record<string, unknown>;
}
function string(value: unknown, path: string): string {
  if (typeof value !== "string") throw new RegionsContractError(path, "a string");
  return value;
}
function positiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) throw new RegionsContractError(path, "a positive integer");
  return value;
}
function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new RegionsContractError(path, "a boolean");
  return value;
}
function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new RegionsContractError(path, "an array");
  return value;
}

function parseCity(value: unknown, path: string): CityDto {
  const source = record(value, path);
  return {
    id: positiveInteger(source.id, `${path}.id`),
    region_id: positiveInteger(source.region_id, `${path}.region_id`),
    name: string(source.name, `${path}.name`),
    is_active: boolean(source.is_active, `${path}.is_active`),
  };
}

export function parseRegionsResponse(value: unknown): RegionsResponseDto {
  const source = record(value, "response");
  return {
    success: boolean(source.success, "response.success"),
    message: string(source.message, "response.message"),
    data: array(source.data, "response.data").map((regionValue, index) => {
      const path = `response.data[${index}]`;
      const region = record(regionValue, path);
      return {
        id: positiveInteger(region.id, `${path}.id`),
        name: string(region.name, `${path}.name`),
        cities: array(region.cities, `${path}.cities`).map((city, cityIndex) => parseCity(city, `${path}.cities[${cityIndex}]`)),
      };
    }),
  };
}

export function parseCitiesResponse(value: unknown): readonly CityDto[] {
  if (Array.isArray(value)) return value.map((city, index) => parseCity(city, `response[${index}]`));
  const source = record(value, "response");
  return array(source.data, "response.data").map((city, index) => parseCity(city, `response.data[${index}]`));
}

export function mapCityDto(city: CityDto): LaravelCity {
  return {
    source: "laravel",
    id: city.id,
    regionId: city.region_id,
    name: city.name,
    isAvailable: city.is_active,
  };
}
