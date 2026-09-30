import { hasLocale } from "next-intl";

import { getOffersData } from "@/features/offers/api/get-offers-data";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

const headers = { "Cache-Control": "private, no-store" };

function parseQuery(params: URLSearchParams) {
  for (const key of params.keys()) {
    if ((key !== "page" && key !== "city_id") || params.getAll(key).length !== 1) {
      throw new TypeError("Invalid query");
    }
  }
  const positiveInteger = (value: string | null): number => {
    if (value === null || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new TypeError("Invalid query");
    }
    return Number(value);
  };
  return {
    page: positiveInteger(params.get("page")),
    cityId: params.has("city_id") ? positiveInteger(params.get("city_id")) : null,
  };
}

export async function GET(request: Request) {
  const locale = request.headers.get("Accept-Language");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return Response.json({ code: "invalid-locale" }, { status: 400, headers });
  }
  let query: ReturnType<typeof parseQuery>;
  try {
    query = parseQuery(new URL(request.url).searchParams);
  } catch {
    return Response.json({ code: "invalid-input" }, { status: 400, headers });
  }
  try {
    const offers = await getOffersData({ ...query, locale, signal: request.signal });
    return Response.json(offers.discountedProducts, { headers });
  } catch (error) {
    const status = error instanceof ApiError && error.status >= 400 && error.status < 500
      ? error.status : 503;
    return Response.json({ code: "offers-unavailable" }, { status, headers });
  }
}
