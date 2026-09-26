export type City = {
  id: number;
  regionId: number;
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
  warehouseId: number;
};

export function getCanonicalBackendCityId(city: City | null): number | null {
  return city?.id ?? null;
}
