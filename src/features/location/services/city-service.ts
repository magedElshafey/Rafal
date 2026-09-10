import type { Locale } from "next-intl";

import { MOCK_CITIES } from "@/features/location/data/mock-cities";
import type { City, Coordinates } from "@/features/location/types";

export type CityService = {
  getCityById(cityId: string, locale: Locale): Promise<City | null>;
  listCities(locale: Locale): Promise<City[]>;
  findCityByCoordinates(
    coordinates: Coordinates,
    locale: Locale,
  ): Promise<City | null>;
};

const MOCK_RESPONSE_DELAY_MS = 250;
const MOCK_GEOLOCATED_CITY_ID = "riyadh";
const cityListRequests = new Map<Locale, Promise<City[]>>();

function mapCity(
  city: (typeof MOCK_CITIES)[number],
  locale: Locale,
): City {
  return {
    id: city.id,
    name: city.names[locale],
    isAvailable: city.isAvailable,
  };
}

function findMockCity(cityId: string) {
  return MOCK_CITIES.find((city) => city.id === cityId);
}

export const cityService: CityService = {
  async getCityById(cityId, locale) {
    const city = findMockCity(cityId);
    if (!city || !city.isAvailable) return null;

    return mapCity(city, locale);
  },

  listCities(locale) {
    const cachedRequest = cityListRequests.get(locale);
    if (cachedRequest) return cachedRequest;

    const request = new Promise<City[]>((resolve) => {
      setTimeout(() => {
        const uniqueCities = new Map<string, City>();

        for (const city of MOCK_CITIES) {
          if (!uniqueCities.has(city.id)) {
            uniqueCities.set(city.id, mapCity(city, locale));
          }
        }

        resolve([...uniqueCities.values()]);
      }, MOCK_RESPONSE_DELAY_MS);
    });

    cityListRequests.set(locale, request);
    return request;
  },

  async findCityByCoordinates(coordinates, locale) {
    // The mock adapter is deterministic. A future API adapter will use the
    // coordinates without requiring changes to the controller or dialog.
    void coordinates;
    await new Promise((resolve) => setTimeout(resolve, MOCK_RESPONSE_DELAY_MS));

    const city = findMockCity(MOCK_GEOLOCATED_CITY_ID);
    return city?.isAvailable ? mapCity(city, locale) : null;
  },
};
