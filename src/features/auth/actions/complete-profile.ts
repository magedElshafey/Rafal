"use server";

import {
  isPlainRecord,
  mapProtectedAuthActionError,
  parseAuthLocale,
} from "@/features/auth/actions/auth-action-utils";
import { completeProfileDto } from "@/features/auth/api/auth-api.server";
import { mapAuthUser } from "@/features/auth/api/parse-auth-dto";
import { getAccessToken } from "@/features/auth/server/auth-session";
import type {
  AuthenticatedActionResult,
  CompleteProfileField,
} from "@/features/auth/types/auth.types";
import { normalizeSaudiPhoneForSubmission } from "@/features/auth/utils/normalize-saudi-phone";
import { ApiError } from "@/lib/api/api-error";

const completeProfileFieldMap = {
  first_name: "firstName",
  last_name: "lastName",
  phone: "phone",
  terms_accepted: "termsAccepted",
} as const satisfies Record<string, CompleteProfileField>;

function getValidationFields(details: unknown): readonly CompleteProfileField[] {
  if (typeof details !== "object" || details === null || Array.isArray(details)) {
    return [];
  }

  return Object.keys(details).flatMap((field) => {
    const mappedField = completeProfileFieldMap[
      field as keyof typeof completeProfileFieldMap
    ];
    return mappedField ? [mappedField] : [];
  });
}

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
      phone: normalizeSaudiPhoneForSubmission(input.phone),
      terms_accepted: true,
    });
    if (!response.success) {
      return { ok: false, error: { code: "service-unavailable" } };
    }
    const user = mapAuthUser(response.data);
    return { ok: true, user, profileComplete: user.profileComplete };
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      return {
        ok: false,
        error: {
          code: "invalid-input",
          fields: getValidationFields(error.details),
        },
      };
    }
    return mapProtectedAuthActionError(error);
  }
}
