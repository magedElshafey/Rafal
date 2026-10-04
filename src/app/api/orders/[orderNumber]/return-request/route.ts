import { hasLocale } from "next-intl";

import { clearAccessToken } from "@/features/auth/server/auth-session";
import { parseOrderReturnSubmissionInput } from "@/features/order-returns/utils/order-return-contract";
import {
  createCurrentUserOrderReturn,
  OrderReturnAuthenticationError,
  OrderReturnIdentityMismatchError,
  OrderReturnUnexpectedStatusError,
} from "@/features/order-returns/server/order-returns-boundary";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" } as const;

function errorResponse(code: string, status: number) {
  return Response.json(
    { code },
    { status, headers: PRIVATE_NO_STORE_HEADERS },
  );
}

type OrderReturnRouteContext = {
  params: Promise<{ orderNumber: string }>;
};

export async function POST(request: Request, context: OrderReturnRouteContext) {
  const locale = new URL(request.url).searchParams.get("locale");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return errorResponse("invalid-locale", 400);
  }

  const { orderNumber: rawOrderNumber } = await context.params;
  const orderNumber = rawOrderNumber.trim();
  if (!orderNumber) return errorResponse("invalid-order-number", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid-reason", 400);
  }

  const input = parseOrderReturnSubmissionInput(body);
  if (!input) return errorResponse("invalid-reason", 400);

  try {
    const returnRequest = await createCurrentUserOrderReturn(
      locale,
      orderNumber,
      input.reason,
      request.signal,
    );
    return Response.json(
      { request: returnRequest },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  } catch (error) {
    if (
      error instanceof OrderReturnAuthenticationError ||
      (error instanceof ApiError && error.status === 401)
    ) {
      await clearAccessToken();
      return errorResponse("unauthorized", 401);
    }
    if (error instanceof ApiError && error.status === 429) {
      return errorResponse("rate-limited", 429);
    }
    if (
      error instanceof OrderReturnIdentityMismatchError ||
      error instanceof OrderReturnUnexpectedStatusError
    ) {
      return errorResponse("service-unavailable", 502);
    }
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
      return errorResponse("not-allowed", error.status);
    }
    return errorResponse("service-unavailable", 503);
  }
}
