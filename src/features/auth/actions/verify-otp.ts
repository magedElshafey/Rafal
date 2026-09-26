"use server";

import {
  isPlainRecord,
  mapPublicAuthActionError,
  parseAuthLocale,
} from "@/features/auth/actions/auth-action-utils";
import { verifyOtpDto } from "@/features/auth/api/auth-api.server";
import { mapAuthUser } from "@/features/auth/api/parse-auth-dto";
import {
  clearPendingOtpEmail,
  getPendingOtpEmail,
  setAccessToken,
} from "@/features/auth/server/auth-session";
import type { AuthenticatedActionResult } from "@/features/auth/types/auth.types";

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

  const email = await getPendingOtpEmail();
  if (!email) {
    return { ok: false, error: { code: "pending-email-missing" } };
  }

  try {
    const response = await verifyOtpDto(locale, { email, code });
    if (!response.success) {
      return { ok: false, error: { code: "service-unavailable" } };
    }
    await setAccessToken(response.data.token);
    await clearPendingOtpEmail();
    const user = mapAuthUser(response.data.user);
    return {
      ok: true,
      user,
      profileComplete: user.profileComplete,
    };
  } catch (error) {
    return mapPublicAuthActionError(error);
  }
}
