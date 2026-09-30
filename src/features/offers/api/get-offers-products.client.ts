import type { Locale } from "next-intl";

import type { PaginatedListingProducts } from "@/features/products/types/product-listing.types";
import { createHttpClient } from "@/lib/api/http-client";

export function getOffersProductsClient({ locale, cityId, page, signal }: {
  locale: Locale;
  cityId: number | null;
  page: number;
  signal?: AbortSignal;
}): Promise<PaginatedListingProducts> {
  const api = createHttpClient({
    baseUrl: new URL("/api/", window.location.origin),
    getDefaultHeaders: () => ({ "Accept-Language": locale }),
    // Laravel's server-side transport owns GET retries; avoid multiplying them.
    maxRetries: 0,
  });
  return api.request<PaginatedListingProducts>({
    path: "/offers",
    query: { page, city_id: cityId ?? undefined },
    signal,
  });
}
