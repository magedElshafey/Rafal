"use server";

import {
  mapPublicAuthActionError,
  parseAuthLocale,
  isPlainRecord,
} from "@/features/auth/actions/auth-action-utils";
import { requestOtpDto } from "@/features/auth/api/auth-api.server";
import { setPendingOtpEmail } from "@/features/auth/server/auth-session";
import type { RequestOtpResult } from "@/features/auth/types/auth.types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestOtp(
  input: unknown,
  localeValue: unknown,
): Promise<RequestOtpResult> {
  const locale = parseAuthLocale(localeValue);
  const email =
    isPlainRecord(input) && typeof input.email === "string"
      ? input.email.trim().toLowerCase()
      : "";
  if (!locale || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: { code: "invalid-input" } };
  }

  try {
    const response = await requestOtpDto(locale, { email });
    if (!response.success) {
      return { ok: false, error: { code: "service-unavailable" } };
    }
    await setPendingOtpEmail(email);
    return { ok: true };
  } catch (error) {
    return mapPublicAuthActionError(error);
  }
}
