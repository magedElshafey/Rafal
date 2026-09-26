import "server-only";

import type { Locale } from "next-intl";

import {
  authEndpoints,
  type CompleteProfileDto,
  type RequestOtpDto,
  type VerifyOtpDto,
} from "@/features/auth/api/auth-dto";
import {
  parseAuthMessageResponse,
  parseAuthUserResponse,
  parseVerifyOtpResponse,
} from "@/features/auth/api/parse-auth-dto";
import { serverApi } from "@/lib/api/server-api";

function authHeaders(locale: Locale, accessToken?: string): HeadersInit {
  return {
    "Accept-Language": locale,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export async function requestOtpDto(locale: Locale, body: RequestOtpDto) {
  const payload = await serverApi.request<unknown, RequestOtpDto>({
    path: authEndpoints.requestOtp,
    method: "POST",
    headers: authHeaders(locale),
    body,
  });
  return parseAuthMessageResponse(payload);
}

export async function verifyOtpDto(locale: Locale, body: VerifyOtpDto) {
  const payload = await serverApi.request<unknown, VerifyOtpDto>({
    path: authEndpoints.verifyOtp,
    method: "POST",
    headers: authHeaders(locale),
    body,
  });
  return parseVerifyOtpResponse(payload);
}

export async function completeProfileDto(
  locale: Locale,
  accessToken: string,
  body: CompleteProfileDto,
) {
  const payload = await serverApi.request<unknown, CompleteProfileDto>({
    path: authEndpoints.completeProfile,
    method: "POST",
    headers: authHeaders(locale, accessToken),
    body,
  });
  return parseAuthUserResponse(payload);
}

export async function getMeDto(locale: Locale, accessToken: string) {
  const payload = await serverApi.request<unknown>({
    path: authEndpoints.me,
    headers: authHeaders(locale, accessToken),
  });
  return parseAuthUserResponse(payload);
}
