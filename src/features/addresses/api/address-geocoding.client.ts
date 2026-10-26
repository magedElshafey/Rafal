import type { Locale } from "next-intl";
import type { AddressMapCity, AddressMapPoint, AddressMapSuggestion, CityViewport } from "@/features/addresses/types/address-map.types";
import { createHttpClient } from "@/lib/api/http-client";

const provider = createHttpClient({ baseUrl: new URL("https://eu1.locationiq.com/v1/"), timeoutMs: 8_000, maxRetries: 0 });

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid map response.");
  return value as Record<string, unknown>;
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 300 || /[\u0000-\u001f\u007f]/.test(value)) return undefined;
  return value.trim().replace(/\s+/g, " ") || undefined;
}

export function parseAddressSuggestion(value: unknown): AddressMapSuggestion {
  const response = record(value);
  if (response.address == null) return { countryStatus: "unknown" };
  const address = record(response.address);
  const country = text(address.country_code)?.toLowerCase();
  // Navigation bounds are not country evidence. Missing evidence fails closed.
  if (!country || !/^[a-z]{2}$/.test(country)) return { countryStatus: "unknown" };
  if (country !== "sa") return { countryStatus: "outside" };
  const road = text(address.road) ?? text(address.pedestrian) ?? text(address.footway);
  const house = text(address.house_number);
  const street = road && house && !road.split(/[\s,،]+/).includes(house)
    ? `${house} ${road}` : road;
  return {
    countryStatus: "saudi",
    district: text(address.suburb) ?? text(address.neighbourhood) ?? text(address.quarter)
      ?? text(address.city_district) ?? text(address.residential),
    streetDetails: street && street.length <= 300 ? street : road,
    city: text(address.city) ?? text(address.town) ?? text(address.village),
    region: text(address.state),
  };
}

export async function reverseGeocodeAddress(point: AddressMapPoint, locale: Locale, publicToken: string, signal: AbortSignal): Promise<AddressMapSuggestion> {
  if (!publicToken || !Number.isFinite(point.lat) || !Number.isFinite(point.lng) || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) {
    throw new Error("Map selection unavailable.");
  }
  // Neutral transport: deliberately no Laravel locale/auth/Cart adapters.
  const payload = await provider.request<unknown>({
    path: "reverse", retry: false, signal,
    query: { key: publicToken, lat: point.lat, lon: point.lng, format: "json", addressdetails: 1, "accept-language": locale },
  });
  return parseAddressSuggestion(payload);
}

// Conservative same-language comparison, not a transliteration or City-ID resolver.
export function geographicName(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا").replace(/^(?:منطقة|المنطقة)\s+/u, "")
    .replace(/\s+(?:region|province)$/i, "").replace(/\s+/g, " ").trim();
}

export function addressCityConflict(city: AddressMapCity | null, suggestion: AddressMapSuggestion): boolean {
  if (!city || suggestion.countryStatus !== "saudi") return false;
  return Boolean(
    (suggestion.city && geographicName(city.name) !== geographicName(suggestion.city)) ||
    (city.regionName && suggestion.region && geographicName(city.regionName) !== geographicName(suggestion.region)),
  );
}

export function parseCityViewport(value: unknown, city: AddressMapCity): CityViewport | null {
  if (!Array.isArray(value)) throw new Error("Invalid city response.");
  if (!city.regionName || !city.name.trim() || value.length >= 5) return null;
  const matches: CityViewport[] = [];
  for (const item of value) {
    const candidate = record(item);
    if (!candidate.address) continue;
    const address = record(candidate.address);
    const name = text(address.city) ?? text(address.town) ?? text(address.municipality);
    const region = text(address.state);
    const isCity = (candidate.class === "place" && ["city", "town", "municipality"].includes(String(candidate.type))) ||
      (candidate.class === "boundary" && candidate.type === "administrative");
    if (!isCity || text(address.country_code)?.toLowerCase() !== "sa" || !name || !region ||
      geographicName(name) !== geographicName(city.name) || geographicName(region) !== geographicName(city.regionName)) continue;
    const lat = typeof candidate.lat === "string" && candidate.lat.trim() ? Number(candidate.lat) : NaN;
    const lng = typeof candidate.lon === "string" && candidate.lon.trim() ? Number(candidate.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 16 || lat > 33 || lng < 34 || lng > 56) continue;
    let bounds: CityViewport["bounds"];
    if (Array.isArray(candidate.boundingbox) && candidate.boundingbox.length === 4 &&
      candidate.boundingbox.every(v => typeof v === "string" && v.trim() && Number.isFinite(Number(v)))) {
      const [south, north, west, east] = candidate.boundingbox.map(Number);
      if (south >= 16 && north <= 33 && west >= 34 && east <= 56 && south < north && west < east &&
        north - south <= 3 && east - west <= 3 && lat >= south && lat <= north && lng >= west && lng <= east) {
        bounds = [south, west, north, east];
      }
    }
    // Duplicate rows for exactly the same point do not make a second location.
    if (!matches.some(match => match.center.lat === lat && match.center.lng === lng)) matches.push({ center: { lat, lng }, ...(bounds ? { bounds } : {}) });
  }
  return matches.length === 1 ? matches[0] : null;
}

export async function resolveCityViewport(city: AddressMapCity, locale: Locale, publicToken: string, signal: AbortSignal): Promise<CityViewport | null> {
  if (!city.regionName || !city.name.trim() || !publicToken) return null;
  const payload = await provider.request<unknown>({
    path: "search", retry: false, signal,
    query: { key: publicToken, city: city.name, state: city.regionName, countrycodes: "sa", format: "json", addressdetails: 1, limit: 5, "accept-language": locale },
  });
  return parseCityViewport(payload, city);
}

// Component-owned request lifecycle; no global cache or stored coordinates.
export function createAddressLookup(
  lookup: (point: AddressMapPoint, signal: AbortSignal) => Promise<AddressMapSuggestion>,
  onResult: (suggestion: AddressMapSuggestion) => void,
  onError: () => void,
) {
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  let lastKey: string | undefined;
  let lastStarted = 0;
  function cancel() {
    generation++;
    clearTimeout(timer);
    controller?.abort();
    lastKey = undefined;
  }
  return {
    cancel,
    select(point: AddressMapPoint) {
      const key = `${point.lat},${point.lng}`;
      if (key === lastKey) return false;
      cancel();
      lastKey = key;
      const current = generation;
      controller = new AbortController();
      const signal = controller.signal;
      // Coalesce rapid selections; at most one new lookup/second in this picker.
      timer = setTimeout(async () => {
        lastStarted = Date.now();
        try {
          const result = await lookup(point, signal);
          if (current === generation && !signal.aborted) onResult(result);
        } catch {
          if (current === generation && !signal.aborted) { lastKey = undefined; onError(); }
        }
      }, Math.max(350, 1_050 - (Date.now() - lastStarted)));
      return true;
    },
  };
}
