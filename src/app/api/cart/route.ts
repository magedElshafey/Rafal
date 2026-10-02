import { hasLocale } from "next-intl";

import { getCurrentCart } from "@/features/cart/server/cart-boundary";
import { routing } from "@/i18n/routing";

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
} as const;

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const locale = searchParams.get("locale");
  const cityIdValue = searchParams.get("cityId");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return Response.json(
      { code: "invalid-locale" },
      { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }

  const cityId = cityIdValue === null ? undefined : Number(cityIdValue);
  if (
    cityId !== undefined &&
    (!Number.isSafeInteger(cityId) || cityId <= 0)
  ) {
    return Response.json(
      { code: "invalid-city" },
      { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }

  try {
    return Response.json(await getCurrentCart(locale, cityId), {
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  } catch {
    return Response.json(
      { code: "service-unavailable" },
      { status: 503, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
}
