import { hasLocale } from "next-intl";

import { clearAccessToken } from "@/features/auth/server/auth-session";
import {
  cancelCurrentUserOrder,
  OrderIdentityMismatchError,
  OrdersAuthenticationError,
} from "@/features/orders/server/orders-boundary";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" } as const;

function errorResponse(code: string, status: number) {
  return Response.json(
    { code },
    { status, headers: PRIVATE_NO_STORE_HEADERS },
  );
}

type CancelOrderRouteContext = {
  params: Promise<{ orderNumber: string }>;
};

export async function POST(request: Request, context: CancelOrderRouteContext) {
  const locale = new URL(request.url).searchParams.get("locale");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return errorResponse("invalid-locale", 400);
  }

  const { orderNumber } = await context.params;
  if (!orderNumber.trim()) return errorResponse("invalid-order-number", 400);

  try {
    const order = await cancelCurrentUserOrder(
      locale,
      orderNumber,
      request.signal,
    );
    return Response.json(
      { orderNumber: order.orderNumber },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  } catch (error) {
    if (
      error instanceof OrdersAuthenticationError ||
      (error instanceof ApiError && error.status === 401)
    ) {
      await clearAccessToken();
      return errorResponse("unauthorized", 401);
    }
    if (error instanceof OrderIdentityMismatchError) {
      return errorResponse("service-unavailable", 502);
    }
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
      return errorResponse("cancellation-rejected", error.status);
    }
    return errorResponse("service-unavailable", 503);
  }
}
