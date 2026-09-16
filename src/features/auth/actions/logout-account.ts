"use server";

import { hasLocale } from "next-intl";
import { cookies } from "next/headers";

import { serverEnv } from "@/config/server-env";
import { MOCK_AUTH_GUEST_COOKIE_NAME } from "@/features/auth/server/auth-boundary";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export async function logoutAccount(formData: FormData): Promise<never> {
  const locale = formData.get("locale");
  if (typeof locale !== "string" || !hasLocale(routing.locales, locale)) {
    throw new Error("Invalid logout locale.");
  }

  if (serverEnv.useMockAuth) {
    const cookieStore = await cookies();
    cookieStore.set(MOCK_AUTH_GUEST_COOKIE_NAME, "1", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return redirect({ href: "/login", locale });
}
