import "server-only";

import { hasLocale, type Locale } from "next-intl";

import { clearAccessToken } from "@/features/auth/server/auth-session";
import type { AuthActionFailure } from "@/features/auth/types/auth.types";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

export function parseAuthLocale(value: unknown): Locale | null {
  return typeof value === "string" && hasLocale(routing.locales, value)
    ? value
    : null;
}

export function mapPublicAuthActionError(error: unknown): AuthActionFailure {
  if (error instanceof ApiError && error.status === 401) {
    return { ok: false, error: { code: "unauthorized" } };
  }
  if (error instanceof ApiError && error.status === 422) {
    return { ok: false, error: { code: "invalid-input" } };
  }
  return { ok: false, error: { code: "service-unavailable" } };
}

export async function mapProtectedAuthActionError(
  error: unknown,
): Promise<AuthActionFailure> {
  if (error instanceof ApiError && error.status === 401) {
    await clearAccessToken();
    return { ok: false, error: { code: "unauthorized" } };
  }
  return mapPublicAuthActionError(error);
}

export function isPlainRecord(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
