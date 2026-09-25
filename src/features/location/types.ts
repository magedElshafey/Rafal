export type City = {
  id: number;
  regionId: number;
  name: string;
};

export function getCanonicalBackendCityId(city: City | null): number | null {
  return city?.id ?? null;
}
