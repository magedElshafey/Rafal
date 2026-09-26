const SAUDI_COUNTRY_CODE = "966";

export function normalizeSaudiPhoneForSubmission(value: string): string {
  const compact = value.trim().replace(/[\s()-]/g, "");

  if (compact.startsWith(`+${SAUDI_COUNTRY_CODE}`)) return compact;
  if (compact.startsWith(`00${SAUDI_COUNTRY_CODE}`)) {
    return `+${compact.slice(2)}`;
  }
  if (compact.startsWith(SAUDI_COUNTRY_CODE)) return `+${compact}`;

  const localNumber = compact.startsWith("0") ? compact.slice(1) : compact;
  return `+${SAUDI_COUNTRY_CODE}${localNumber}`;
}
