export type MockCity = { source: "mock"; id: string; name: string; isAvailable: boolean };
export type LaravelCity = {
  source: "laravel";
  id: number;
  regionId: number;
  name: string;
  isAvailable: boolean;
};
export type City = MockCity | LaravelCity;
export type LocationSource = City["source"];
export type Coordinates = { latitude: number; longitude: number };

export function getCanonicalBackendCityId(city: City | null): number | null {
  return city?.source === "laravel" ? city.id : null;
}
