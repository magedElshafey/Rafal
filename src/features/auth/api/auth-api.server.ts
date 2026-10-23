import "server-only";

import type { Locale } from "next-intl";

import {
  authEndpoints,
  type CompleteProfileDto,
  type RequestOtpDto,
  type UpdateProfileDto,
  type VerifyOtpDto,
} from "@/features/auth/api/auth-dto";
import {
  parseAuthMessageResponse,
  parseAuthUserResponse,
  parseVerifyOtpResponse,
} from "@/features/auth/api/parse-auth-dto";
import { serverApi } from "@/lib/api/server-api";
import { ApiError } from "@/lib/api/api-error";

function authHeaders(locale: Locale, accessToken?: string): HeadersInit {
  return {
    "Accept-Language": locale,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

function buildProfileFormData(
  body: Pick<CompleteProfileDto, "first_name" | "last_name" | "phone"> & { email?: string },
  termsAccepted: boolean,
): FormData {
  const formData = new FormData();
  formData.append("first_name", body.first_name);
  formData.append("last_name", body.last_name);
  formData.append("phone", body.phone);
  if (body.email !== undefined) formData.append("email", body.email);
  formData.append("terms_accepted", termsAccepted ? "1" : "0");
  return formData;
}

export async function requestOtpDto(locale: Locale, body: RequestOtpDto) {
  const payload = await serverApi.request<unknown, RequestOtpDto>({ locale,
    path: authEndpoints.requestOtp,
    method: "POST",
    headers: authHeaders(locale),
    body,
    retry: false,
  });
  return parseAuthMessageResponse(payload);
}

export async function verifyOtpDto(locale: Locale, body: VerifyOtpDto) {
  const payload = await serverApi.request<unknown, VerifyOtpDto>({ locale,
    path: authEndpoints.verifyOtp,
    method: "POST",
    headers: authHeaders(locale),
    body,
    retry: false,
  });
  return parseVerifyOtpResponse(payload);
}

export async function completeProfileDto(
  locale: Locale,
  accessToken: string,
  body: CompleteProfileDto,
) {
  // Temporary integration diagnostics: never include values, errors, or bodies.
  console.info("[auth:complete-profile]", { stage: "request" });
  let payload: unknown;
  try {
    payload = await serverApi.request<unknown, FormData>({ locale,
      path: authEndpoints.completeProfile,
      method: "POST",
      headers: authHeaders(locale, accessToken),
      body: buildProfileFormData(body, body.terms_accepted),
      retry: false,
    });
  } catch (error) {
    console.error("[auth:complete-profile]", {
      stage: "request",
      upstreamStatus: error instanceof ApiError ? error.status : null,
      category: error instanceof ApiError ? "http" : "transport-or-response-read",
    });
    throw error;
  }

  const response = typeof payload === "object" && payload !== null
    ? payload as Record<string, unknown>
    : null;
  const data = typeof response?.data === "object" && response.data !== null
    ? response.data as Record<string, unknown>
    : null;
  console.info("[auth:complete-profile]", {
    stage: "response-parse",
    // The shared client exposes error statuses, not successful response statuses.
    upstreamStatus: null,
    successPresent: response !== null && Object.hasOwn(response, "success"),
    dataPresent: response !== null && Object.hasOwn(response, "data"),
    profileCompleteIsBoolean: typeof data?.profile_complete === "boolean",
  });
  try {
    return parseAuthUserResponse(payload);
  } catch (error) {
    console.error("[auth:complete-profile]", {
      stage: "response-parse",
      category: "invalid-contract",
    });
    throw error;
  }
}

export async function updateProfileDto(
  locale: Locale,
  accessToken: string,
  body: UpdateProfileDto,
) {
  const payload = await serverApi.request<unknown, FormData>({ locale,
    path: authEndpoints.completeProfile,
    method: "POST",
    headers: authHeaders(locale, accessToken),
    body: buildProfileFormData(body, true),
    retry: false,
  });
  return parseAuthUserResponse(payload);
}

export async function getMeDto(locale: Locale, accessToken: string) {
  const payload = await serverApi.request<unknown>({ locale,
    path: authEndpoints.me,
    headers: authHeaders(locale, accessToken),
  });
  return parseAuthUserResponse(payload);
}
