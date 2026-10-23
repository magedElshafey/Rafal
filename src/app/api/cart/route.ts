import { hasLocale } from "next-intl";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";

import { getCurrentCart } from "@/features/cart/server/cart-boundary";
import { resolveCartTransportIdentity } from "@/features/cart/server/cart-auth-context";
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
    const reconcile = request.headers.get("X-Recommendation-Reconcile") === "1";
    const guest = reconcile && request.headers.get("X-Rafal-Cart-Mode") === "guest";
    const identity = guest ? await resolveCartTransportIdentity() : null;
    const user = reconcile && !guest ? await getCurrentUser(locale) : null;
    if (reconcile && (guest ? identity?.kind !== "guest" || !identity.token : !user)) {
      return Response.json({ code: "account-unconfirmed" }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS });
    }
    return Response.json(await getCurrentCart(locale, cityId), {
      headers: { ...PRIVATE_NO_STORE_HEADERS, ...(user ? { "X-Rafal-Account-Id": user.id } : {}),
        ...(reconcile ? { "X-Rafal-Cart-Mode": guest ? "guest" : "authenticated" } : {}) },
    });
  } catch {
    return Response.json(
      { code: "service-unavailable" },
      { status: 503, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
}
