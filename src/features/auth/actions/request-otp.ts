"use server";

import {
  mapPublicAuthActionError,
  parseAuthLocale,
  isPlainRecord,
} from "@/features/auth/actions/auth-action-utils";
import { requestOtpDto } from "@/features/auth/api/auth-api.server";
import { setPendingOtpPhone } from "@/features/auth/server/auth-session";
import type { RequestOtpResult } from "@/features/auth/types/auth.types";

import { normalizeSaudiMobile } from "@/lib/phone/saudi-mobile";

export async function requestOtp(
  input: unknown,
  localeValue: unknown,
): Promise<RequestOtpResult> {
  const locale = parseAuthLocale(localeValue);
  const phone =
    isPlainRecord(input) && typeof input.phone === "string"
      ? normalizeSaudiMobile(input.phone)
      : "";
  if (!locale || !phone) {
    return { ok: false, error: { code: "invalid-input" } };
  }

  try {
    const response = await requestOtpDto(locale, { phone });
    if (!response.success) {
      return { ok: false, error: { code: "service-unavailable" } };
    }
    await setPendingOtpPhone(phone);
    return { ok: true };
  } catch (error) {
    return mapPublicAuthActionError(error);
  }
}
