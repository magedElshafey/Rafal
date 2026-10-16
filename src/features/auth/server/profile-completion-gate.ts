import "server-only";

import { headers } from "next/headers";
import type { Locale } from "next-intl";

import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { getSafeInternalReturnTo } from "@/features/auth/utils/safe-return-to";
import { redirect } from "@/i18n/navigation";

/** Guests can shop; authenticated customers must finish onboarding first. */
export async function requireProfileCompletion(locale: Locale): Promise<void> {
  // Match page/header reads so React.cache shares the current-user request.
  const user = await getCurrentUser();
  if (!user || user.profileComplete) return;

  const path = (await headers()).get("x-rafal-request-path") ?? "/";
  const prefix = `/${locale}`;
  const destination = path === prefix ? "/" : path.startsWith(`${prefix}/`)
    ? path.slice(prefix.length)
    : path;
  redirect({
    href: {
      pathname: "/register",
      query: { returnTo: getSafeInternalReturnTo(destination) },
    },
    locale,
  });
}
