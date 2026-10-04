import { hasLocale } from "next-intl";

import {
  classifyGuestOrderLookupError,
  GuestOrderIdentityMismatchError,
  lookupGuestOrder,
} from "@/features/orders/server/guest-order-boundary";
import { parseGuestOrderLookupInput } from "@/features/orders/utils/guest-order-lookup-contract";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" } as const;

function errorResponse(code: string, status: number) {
  return Response.json(
    { ok: false, code },
    { status, headers: PRIVATE_NO_STORE_HEADERS },
  );
}

export async function POST(request: Request) {
  const locale = request.headers.get("Accept-Language");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return errorResponse("invalid-input", 400);
  }

  let rawInput: unknown;
  try {
    rawInput = await request.json();
  } catch {
    return errorResponse("invalid-input", 400);
  }
  const input = parseGuestOrderLookupInput(rawInput);
  if (!input) return errorResponse("invalid-input", 400);

  try {
    const order = await lookupGuestOrder(locale, input, request.signal);
    return Response.json(
      { ok: true, order },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  } catch (error) {
    const code =
      error instanceof GuestOrderIdentityMismatchError
        ? "service-unavailable"
        : classifyGuestOrderLookupError(error);
    if (code === "service-unavailable") {
      console.error("[orders:guest-lookup] lookup failed", {
        category:
          error instanceof GuestOrderIdentityMismatchError
            ? "identity-mismatch"
            : error instanceof ApiError
              ? "backend"
              : "contract-or-network",
        status: error instanceof ApiError ? error.status : undefined,
      });
    }
    return errorResponse(
      code,
      code === "rate-limited" ? 429 : code === "lookup-mismatch" ? 404 : 503,
    );
  }
}
