import { hasLocale } from "next-intl";

import { getCurrentCart } from "@/features/cart/server/cart-boundary";
import { routing } from "@/i18n/routing";

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
} as const;

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return Response.json(
      { code: "invalid-locale" },
      { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }

  try {
    return Response.json(await getCurrentCart(locale), {
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  } catch {
    return Response.json(
      { code: "service-unavailable" },
      { status: 503, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
}
