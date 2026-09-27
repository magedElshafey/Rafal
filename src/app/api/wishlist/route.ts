import { hasLocale } from "next-intl";

import {
  getWishlistPage,
  WishlistAuthenticationError,
} from "@/features/wishlist/server/wishlist-boundary";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store",
} as const;

function positivePage(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const locale = searchParams.get("locale");
  const page = positivePage(searchParams.get("page"));
  if (!locale || !hasLocale(routing.locales, locale) || !page) {
    return Response.json(
      { code: "invalid-input" },
      { status: 400, headers: privateNoStoreHeaders },
    );
  }

  try {
    return Response.json(await getWishlistPage(locale, page), {
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
