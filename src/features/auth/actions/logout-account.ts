"use server";

import { hasLocale } from "next-intl";

import {
  clearAccessToken,
  clearPendingOtpEmail,
} from "@/features/auth/server/auth-session";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export async function logoutAccount(formData: FormData): Promise<never> {
  const locale = formData.get("locale");
  if (typeof locale !== "string" || !hasLocale(routing.locales, locale)) {
    throw new Error("Invalid logout locale.");
  }

  await clearAccessToken();
  await clearPendingOtpEmail();

  return redirect({ href: "/login", locale });
}
