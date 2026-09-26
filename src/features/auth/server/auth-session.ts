import "server-only";

import { cookies } from "next/headers";

const ACCESS_TOKEN_COOKIE_NAME = "rafal_auth_access_token";
const PENDING_EMAIL_COOKIE_NAME = "rafal_auth_pending_email";
const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const PENDING_EMAIL_MAX_AGE_SECONDS = 60 * 10;

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

export async function getPendingOtpEmail(): Promise<string | null> {
  return (await cookies()).get(PENDING_EMAIL_COOKIE_NAME)?.value || null;
}

export async function setPendingOtpEmail(email: string): Promise<void> {
  (await cookies()).set(PENDING_EMAIL_COOKIE_NAME, email, {
    ...cookieOptions,
    maxAge: PENDING_EMAIL_MAX_AGE_SECONDS,
  });
}

export async function clearPendingOtpEmail(): Promise<void> {
  (await cookies()).set(PENDING_EMAIL_COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });
}
