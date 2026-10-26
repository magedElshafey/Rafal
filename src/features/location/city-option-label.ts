import type { City } from "@/features/location/types";

export function cityOptionLabel(city: City, cities: readonly City[]): string {
  return city.regionName && cities.some(other => other.id !== city.id && other.name.trim() === city.name.trim())
    ? `${city.name} — ${city.regionName}` : city.name;
}
