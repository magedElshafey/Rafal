import "server-only";

import type { Locale } from "next-intl";
import { optionalAuthProductRead } from "@/features/products/api/optional-auth-product-read";
import { parseOffersDto } from "@/features/offers/api/parse-offers-dto";
import { mapOffersDto } from "@/features/offers/api/offers-mappers";

export async function getOffersData({ locale, cityId, page, signal }: {
  locale: Locale;
  cityId: number | null;
  page: number;
  signal?: AbortSignal;
}) {
  const response = await optionalAuthProductRead(locale, {
    path: "/offers",
    signal,
    query: { page, city_id: cityId ?? undefined },
  });
  return mapOffersDto(parseOffersDto(response));
}
