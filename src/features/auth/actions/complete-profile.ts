"use server";

import {
  isPlainRecord,
  mapProtectedAuthActionError,
  parseAuthLocale,
} from "@/features/auth/actions/auth-action-utils";
import { completeProfileDto } from "@/features/auth/api/auth-api.server";
import { mapAuthUser } from "@/features/auth/api/parse-auth-dto";
import { getAccessToken } from "@/features/auth/server/auth-session";
import type { AuthenticatedActionResult } from "@/features/auth/types/auth.types";

export async function completeProfile(
  input: unknown,
  localeValue: unknown,
): Promise<AuthenticatedActionResult> {
  const locale = parseAuthLocale(localeValue);
  if (
    !locale ||
    !isPlainRecord(input) ||
    typeof input.firstName !== "string" ||
    input.firstName.trim() === "" ||
    typeof input.lastName !== "string" ||
    input.lastName.trim() === "" ||
    typeof input.phone !== "string" ||
    input.phone.trim() === "" ||
    input.termsAccepted !== true
  ) {
    return { ok: false, error: { code: "invalid-input" } };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { ok: false, error: { code: "unauthorized" } };
  }

  try {
    const response = await completeProfileDto(locale, accessToken, {
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      phone: input.phone.trim(),
      terms_accepted: true,
    });
    if (!response.success) {
      return { ok: false, error: { code: "service-unavailable" } };
    }
    const user = mapAuthUser(response.data);
    return { ok: true, user, profileComplete: user.profileComplete };
  } catch (error) {
    return mapProtectedAuthActionError(error);
  }
}
