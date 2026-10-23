import { hasLocale } from "next-intl";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { resolveCartTransportIdentity } from "@/features/cart/server/cart-auth-context";
import { getCartRecommendations } from "@/features/cart/server/cart-recommendations-boundary";
import { routing } from "@/i18n/routing";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return Response.json({ code: "invalid-locale" }, { status: 400, headers });
  }
  try {
    const guest = request.headers.get("X-Rafal-Cart-Mode") === "guest";
    const identity = guest ? await resolveCartTransportIdentity() : null;
    const user = guest ? null : await getCurrentUser(locale);
    if (guest ? identity?.kind !== "guest" || !identity.token : !user) {
      return Response.json({ code: "account-unconfirmed" }, { status: 401, headers });
    }
    return Response.json(await getCartRecommendations(locale, request.signal), {
      headers: { ...headers, "X-Rafal-Cart-Mode": guest ? "guest" : "authenticated",
        ...(user ? { "X-Rafal-Account-Id": user.id } : {}) },
    });
  } catch {
    return Response.json({ code: "recommendations-unavailable" }, { status: 503, headers });
  }
}
