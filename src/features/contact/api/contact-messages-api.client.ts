import type { Locale } from "next-intl";

import type { ContactMessageInput, ContactMessageResult } from "@/features/contact/types/contact-message.types";
import { isContactRecord, parseContactFieldErrors, validateContactMessage } from "@/features/contact/utils/contact-message-contract";
import { ApiError } from "@/lib/api/api-error";
import { createHttpClient } from "@/lib/api/http-client";

export async function submitContactMessageFromBrowser(
  locale: Locale,
  input: ContactMessageInput,
): Promise<ContactMessageResult> {
  const validation = validateContactMessage(input);
  if (!validation.ok) {
    return { ok: false, code: "validation-error", fieldErrors: validation.fieldErrors };
  }
  const api = createHttpClient({
    baseUrl: new URL("/api/", window.location.origin),
    getDefaultHeaders: () => ({ "Accept-Language": locale }),
  });
  try {
    const payload = await api.request<unknown, ContactMessageInput>({
      path: "/contact-messages",
      method: "POST",
      body: validation.input,
      retry: false,
    });
    return isContactRecord(payload) && payload.ok === true
      ? { ok: true }
      : { ok: false, code: "service-failure" };
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      return { ok: false, code: "rate-limited" };
    }
    if (error instanceof ApiError && error.status === 422 && error.code === "validation-error") {
      return { ok: false, code: "validation-error", fieldErrors: parseContactFieldErrors(error.details) };
    }
    return { ok: false, code: "service-failure" };
  }
}
