"use server";

import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";

import { serverEnv } from "@/config/server-env";
import { MOCK_AUTH_GUEST_COOKIE_NAME } from "@/features/auth/server/auth-boundary";
import { redirect } from "@/i18n/navigation";

export async function logoutAccount(): Promise<never> {
  if (serverEnv.useMockAuth) {
    const cookieStore = await cookies();
    cookieStore.set(MOCK_AUTH_GUEST_COOKIE_NAME, "1", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  const locale = await getLocale();
  return redirect({ href: "/login", locale });
}
