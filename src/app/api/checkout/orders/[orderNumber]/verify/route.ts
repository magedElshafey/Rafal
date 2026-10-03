import { hasLocale } from "next-intl";

import { verifyGuestCheckoutOrder } from "@/features/checkout/server/checkout-boundary";
import { parseCheckoutVerifyRequest } from "@/features/checkout/server/parse-checkout-verify-request";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" } as const;

function errorResponse(status: number) {
  return Response.json(
    { code: "verification-failed" },
    { status, headers: PRIVATE_NO_STORE_HEADERS },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orderNumber: string }> },
) {
  const locale = new URL(request.url).searchParams.get("locale");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return errorResponse(400);
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return errorResponse(400);
  }

  const { orderNumber } = await context.params;
  const verifyRequest = parseCheckoutVerifyRequest(orderNumber, value);
  if (!verifyRequest) return errorResponse(400);

  try {
    const result = await verifyGuestCheckoutOrder(
      locale,
      verifyRequest,
      request.signal,
    );
    return Response.json(result, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof ApiError) {
      const status = error.status >= 400 && error.status < 500
        ? error.status
        : 503;
      return errorResponse(status);
    }
    return errorResponse(502);
  }
}
