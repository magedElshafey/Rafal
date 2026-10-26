export type City = {
  id: number;
  regionId: number;
  regionName?: string;
  name: string;
};

export type ResolvedLocation = {
  city: City;
  inCoverage: boolean;
  message: string | null;
  region: {
    id: number;
    name: string;
  };
  warehouseId: number | null;
};

export function getCanonicalBackendCityId(city: City | null): number | null {
  return city?.id ?? null;
}
