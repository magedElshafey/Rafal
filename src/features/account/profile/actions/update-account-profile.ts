"use server";

import { hasLocale } from "next-intl";
import { revalidatePath } from "next/cache";

import type {
  AccountProfileMutationResult,
  AccountProfileValidationErrors,
  UpdateAccountProfileActionInput,
} from "@/features/account/profile/types/account-profile.types";
import { validateAccountProfile } from "@/features/account/profile/utils/validate-account-profile";
import {
  isPlainRecord,
  mapProtectedAuthActionError,
} from "@/features/auth/actions/auth-action-utils";
import { updateProfileDto } from "@/features/auth/api/auth-api.server";
import { mapAuthUser } from "@/features/auth/api/parse-auth-dto";
import { getAccessToken } from "@/features/auth/server/auth-session";
import { normalizeSaudiPhoneForSubmission } from "@/features/auth/utils/normalize-saudi-phone";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

const updateProfileFieldMap = {
  first_name: "firstName",
  last_name: "lastName",
  phone: "phone",
} as const;

function parseActionInput(
  input: unknown,
): UpdateAccountProfileActionInput | null {
  if (!isPlainRecord(input)) return null;
  if (
    typeof input.locale !== "string" ||
    !hasLocale(routing.locales, input.locale) ||
    typeof input.firstName !== "string" ||
    typeof input.lastName !== "string" ||
    typeof input.phone !== "string"
  ) {
    return null;
  }

  return {
    locale: input.locale,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    phone: input.phone.trim(),
  };
}

function getBackendValidationErrors(
  details: unknown,
): AccountProfileValidationErrors {
  if (!isPlainRecord(details)) return {};

  const errors: AccountProfileValidationErrors = {};
  for (const field of Object.keys(details)) {
    const mappedField =
      updateProfileFieldMap[field as keyof typeof updateProfileFieldMap];
    if (mappedField) {
      errors[mappedField] = mappedField === "phone" ? "phone" : "invalid";
    }
  }
  return errors;
}

export async function updateAccountProfile(
  input: unknown,
): Promise<AccountProfileMutationResult> {
  const actionInput = parseActionInput(input);
  if (!actionInput) {
    return { ok: false, error: { code: "invalid-input", fields: {} } };
  }

  const { locale, ...profile } = actionInput;
  const errors = validateAccountProfile(profile);

  if (Object.keys(errors).length > 0) {
    return { ok: false, error: { code: "invalid-input", fields: errors } };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { ok: false, error: { code: "unauthorized" } };
  }

  try {
    const response = await updateProfileDto(locale, accessToken, {
      first_name: profile.firstName,
      last_name: profile.lastName,
      phone: normalizeSaudiPhoneForSubmission(profile.phone),
    });
    if (!response.success) {
      return { ok: false, error: { code: "service-unavailable" } };
    }

    const user = mapAuthUser(response.data);
    revalidatePath(`/${locale}/account/profile`);

    return {
      ok: true,
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? "",
      },
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      return {
        ok: false,
        error: {
          code: "invalid-input",
          fields: getBackendValidationErrors(error.details),
        },
      };
    }

    const failure = await mapProtectedAuthActionError(error);
    return {
      ok: false,
      error: {
        code:
          failure.error.code === "unauthorized"
            ? "unauthorized"
            : "service-unavailable",
      },
    };
  }
}
