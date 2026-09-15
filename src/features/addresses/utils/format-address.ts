import type { Locale } from "next-intl";

import type { SavedAddress } from "@/features/addresses/types/saved-address.types";

export function formatSavedAddress(
  address: SavedAddress,
  locale: Locale,
): string {
  const separator = locale === "ar" ? "، " : ", ";

  return [
    address.city,
    address.district,
    address.street,
    address.additionalDetails,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(separator);
}
