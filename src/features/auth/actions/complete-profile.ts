"use server";

import {
  isPlainRecord,
  mapProtectedAuthActionError,
  parseAuthLocale,
} from "@/features/auth/actions/auth-action-utils";
import { completeProfileDto } from "@/features/auth/api/auth-api.server";
import { mapAuthUser } from "@/features/auth/api/parse-auth-dto";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { getAccessToken } from "@/features/auth/server/auth-session";
import type {
  AuthenticatedActionResult,
  CompleteProfileField,
} from "@/features/auth/types/auth.types";
import { ApiError } from "@/lib/api/api-error";
import { normalizeSaudiMobile } from "@/lib/phone/saudi-mobile";

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
    input.termsAccepted !== true
  ) {
    return { ok: false, error: { code: "invalid-input" } };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.info("[auth:complete-profile]", { stage: "identity", category: "missing-session" });
    return { ok: false, error: { code: "unauthorized" } };
  }

  let stage: "identity" | "request" | "confirmation" = "identity";
  try {
    const identity = await getCurrentUser(locale);
    const phone = identity ? normalizeSaudiMobile(identity.phone) : null;
    if (!phone) {
      console.info("[auth:complete-profile]", { stage, category: "missing-or-invalid-identity" });
      return { ok: false, error: { code: "unauthorized" } };
    }
    stage = "request";
    const response = await completeProfileDto(locale, accessToken, {
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      phone,
      terms_accepted: true,
    });
    stage = "confirmation";
    if (!response.success) {
      console.info("[auth:complete-profile]", { stage, category: "unsuccessful-envelope" });
      return { ok: false, error: { code: "service-unavailable" } };
    }
    const user = mapAuthUser(response.data);
    if (!user.profileComplete || normalizeSaudiMobile(user.phone) !== phone) {
      console.info("[auth:complete-profile]", {
        stage,
        category: !user.profileComplete ? "profile-incomplete" : "identity-mismatch",
      });
      return { ok: false, error: { code: "service-unavailable" } };
    }
    console.info("[auth:complete-profile]", { stage, category: "confirmed" });
    return { ok: true, user, profileComplete: user.profileComplete };
  } catch (error) {
    if (stage === "identity") {
      console.error("[auth:complete-profile]", {
        stage,
        upstreamStatus: error instanceof ApiError ? error.status : null,
        category: error instanceof ApiError
          ? "http"
          : typeof error === "object" && error !== null &&
              "__NEXT_ERROR_CODE" in error && error.__NEXT_ERROR_CODE === "E1014"
            ? "root-params-in-server-action"
            : "identity-read-failed",
      });
    }
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
