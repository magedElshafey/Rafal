"use server";

import {
  isPlainRecord,
  mapPublicAuthActionError,
  parseAuthLocale,
} from "@/features/auth/actions/auth-action-utils";
import { verifyOtpDto } from "@/features/auth/api/auth-api.server";
import { mapAuthUser } from "@/features/auth/api/parse-auth-dto";
import {
  clearPendingOtpPhone,
  getPendingOtpPhone,
  setAccessToken,
} from "@/features/auth/server/auth-session";
import type { AuthenticatedActionResult } from "@/features/auth/types/auth.types";
import { normalizeSaudiMobile } from "@/lib/phone/saudi-mobile";

export async function verifyOtp(
  input: unknown,
  localeValue: unknown,
): Promise<AuthenticatedActionResult> {
  const locale = parseAuthLocale(localeValue);
  const code =
    isPlainRecord(input) && typeof input.code === "string"
      ? input.code.trim()
      : "";
  if (!locale || code.length === 0 || code.length > 32) {
    return { ok: false, error: { code: "invalid-input" } };
  }

  const phone = await getPendingOtpPhone();
  if (!phone) {
    return { ok: false, error: { code: "pending-phone-missing" } };
  }

  try {
    const response = await verifyOtpDto(locale, { phone, otp: code });
    if (!response.success || normalizeSaudiMobile(response.data.user.phone) !== phone) {
      return { ok: false, error: { code: "service-unavailable" } };
    }
    try {
      await setAccessToken(response.data.token);
      await clearPendingOtpPhone();
    } catch {
      return { ok: false, error: { code: "session-failed" } };
    }
    const user = mapAuthUser(response.data.user);
    return {
      ok: true,
      user,
      profileComplete: response.data.profile_complete,
    };
  } catch (error) {
    return mapPublicAuthActionError(error);
  }
}
