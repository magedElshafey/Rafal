import type { Locale } from "next-intl";
import type { AddressMapPoint, AddressMapSuggestion } from "@/features/addresses/types/address-map.types";
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
