import { hasLocale } from "next-intl";

import { CheckoutCartSessionError, quoteCurrentCheckout } from "@/features/checkout/server/checkout-boundary";
import { parseCheckoutQuoteRequest } from "@/features/checkout/server/parse-checkout-quote-request";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
} as const;

function errorResponse(code: string, status: number) {
  return Response.json(
    { code },
    { status, headers: PRIVATE_NO_STORE_HEADERS },
  );
}

export async function POST(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return errorResponse("invalid-locale", 400);
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return errorResponse("invalid-input", 400);
  }

  const quoteRequest = parseCheckoutQuoteRequest(value);
  if (!quoteRequest) return errorResponse("invalid-input", 400);

  try {
    const quote = await quoteCurrentCheckout(
      locale,
      quoteRequest,
      request.signal,
    );
    return Response.json(quote, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof CheckoutCartSessionError) {
      return errorResponse("cart-session-unavailable", 409);
    }
    if (error instanceof ApiError && error.status === 401) {
      return errorResponse("unauthorized", 401);
    }
    return errorResponse("service-unavailable", 503);
  }
}
