import "server-only";

import type { Locale } from "next-intl";

import { contactFields, type ContactMessageInput } from "@/features/contact/types/contact-message.types";
import { isContactRecord } from "@/features/contact/utils/contact-message-contract";
import { serverApi } from "@/lib/api/server-api";

export async function submitContactMessage(
  locale: Locale,
  input: ContactMessageInput,
  signal?: AbortSignal,
): Promise<void> {
  // Public mutation convention pending a Contact-specific backend artifact.
  const body = new FormData();
  for (const field of contactFields) body.set(field, input[field]);
  const payload = await serverApi.request<unknown, FormData>({
    path: "/contact-messages",
    method: "POST",
    headers: { "Accept-Language": locale },
    body,
    retry: false,
    signal,
  });

  // Fail closed; an HTTP 2xx or a human-readable message alone is not confirmation.
  if (!isContactRecord(payload) || payload.success !== true) {
    throw new Error("Invalid contact submission response");
  }
}
