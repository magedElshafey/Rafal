import "server-only";

import { normalizeSaudiMobile } from "@/lib/phone/saudi-mobile";

import { cookies } from "next/headers";

const ACCESS_TOKEN_COOKIE_NAME = "rafal_auth_access_token";
const PENDING_PHONE_COOKIE_NAME = "rafal_auth_pending_phone";
const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const PENDING_PHONE_MAX_AGE_SECONDS = 60 * 10;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export async function getAccessToken(): Promise<string | null> {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE_NAME)?.value || null;
}

export async function setAccessToken(accessToken: string): Promise<void> {
  (await cookies()).set(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });
}

export async function clearAccessToken(): Promise<void> {
  (await cookies()).set(ACCESS_TOKEN_COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });
}

export async function getPendingOtpPhone(): Promise<string | null> {
  const value = (await cookies()).get(PENDING_PHONE_COOKIE_NAME)?.value;
  return value ? normalizeSaudiMobile(value) : null;
}

export async function setPendingOtpPhone(phone: string): Promise<void> {
  (await cookies()).set(PENDING_PHONE_COOKIE_NAME, phone, {
    ...cookieOptions,
    maxAge: PENDING_PHONE_MAX_AGE_SECONDS,
  });
}

export async function clearPendingOtpPhone(): Promise<void> {
  (await cookies()).set(PENDING_PHONE_COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });
}
