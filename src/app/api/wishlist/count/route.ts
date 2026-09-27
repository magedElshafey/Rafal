import { hasLocale } from "next-intl";

import {
  getWishlistCount,
  WishlistAuthenticationError,
} from "@/features/wishlist/server/wishlist-boundary";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store",
} as const;

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return Response.json(
      { code: "invalid-locale" },
      { status: 400, headers: privateNoStoreHeaders },
    );
  }

  try {
    return Response.json(await getWishlistCount(locale), {
      headers: privateNoStoreHeaders,
    });
  } catch (error) {
    const unauthorized =
      error instanceof WishlistAuthenticationError ||
      (error instanceof ApiError && error.status === 401);
    return Response.json(
      { code: unauthorized ? "unauthorized" : "service-unavailable" },
      { status: unauthorized ? 401 : 503, headers: privateNoStoreHeaders },
    );
  }
}
