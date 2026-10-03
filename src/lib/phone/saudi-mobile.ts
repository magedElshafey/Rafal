const SAUDI_COUNTRY_CODE = "966";
const SAUDI_MOBILE_PATTERN = /^5\d{8}$/;
const HARMLESS_SEPARATORS_PATTERN = /[\s().-]/g;

export function normalizeSaudiMobile(value: string): string | null {
  const compact = value.trim().replace(HARMLESS_SEPARATORS_PATTERN, "");

  let nationalNumber: string;
  if (SAUDI_MOBILE_PATTERN.test(compact)) {
    nationalNumber = compact;
  } else if (/^05\d{8}$/.test(compact)) {
    nationalNumber = compact.slice(1);
  } else if (/^\+9665\d{8}$/.test(compact)) {
    nationalNumber = compact.slice(4);
  } else if (/^9665\d{8}$/.test(compact)) {
    nationalNumber = compact.slice(3);
  } else if (/^009665\d{8}$/.test(compact)) {
    nationalNumber = compact.slice(5);
  } else {
    return null;
  }

  return `+${SAUDI_COUNTRY_CODE}${nationalNumber}`;
}

export function isValidSaudiMobile(value: string): boolean {
  return normalizeSaudiMobile(value) !== null;
}

export function formatSaudiMobileForDisplay(value: string): string {
  const normalized = normalizeSaudiMobile(value);
  if (!normalized) return value;

  const nationalNumber = normalized.slice(4);
  return `+${SAUDI_COUNTRY_CODE} ${nationalNumber.slice(0, 2)} ${nationalNumber.slice(2, 5)} ${nationalNumber.slice(5)}`;
}

export function formatSaudiMobileForInput(value: string): string {
  const normalized = normalizeSaudiMobile(value);
  return normalized ? normalized.slice(4) : value;
}
