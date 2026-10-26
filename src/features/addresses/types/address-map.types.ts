export type AddressMapPoint = Readonly<{ lat: number; lng: number }>;

// Suggestions are never an address payload or evidence of a canonical backend city.
export type AddressMapSuggestion = Readonly<{
  countryStatus: "saudi" | "outside" | "unknown";
  district?: string;
  streetDetails?: string;
  city?: string;
  region?: string;
}>;

export type AddressMapFields = { district: string; streetDetails: string };
