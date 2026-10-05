import { hasLocale } from "next-intl";

import { submitContactMessage } from "@/features/contact/api/contact-messages-api.server";
import type { ContactErrorCode, ContactFieldErrors } from "@/features/contact/types/contact-message.types";
import { validateContactMessage } from "@/features/contact/utils/contact-message-contract";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" } as const;

function errorResponse(code: ContactErrorCode, status: number, errors?: ContactFieldErrors) {
  return Response.json({ ok: false, code, ...(errors ? { errors } : {}) }, {
    status,
    headers: PRIVATE_NO_STORE_HEADERS,
  });
}

export async function POST(request: Request) {
  const locale = request.headers.get("Accept-Language");
  if (!locale || !hasLocale(routing.locales, locale)) {
    return errorResponse("validation-error", 400);
  }
  let rawInput: unknown;
  try {
    rawInput = await request.json();
  } catch {
    return errorResponse("validation-error", 400);
  }
  const validation = validateContactMessage(rawInput);
  if (!validation.ok) return errorResponse("validation-error", 422, validation.fieldErrors);

  try {
    await submitContactMessage(locale, validation.input, request.signal);
    return Response.json({ ok: true }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      return errorResponse("rate-limited", 429);
    }
    // Contact-specific Laravel validation keys are not documented. Do not infer
    // field blame or return backend text (which may contain personal information).
    return errorResponse("service-failure", 503);
  }
}
