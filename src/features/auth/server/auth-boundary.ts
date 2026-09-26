import "server-only";

import { cache } from "react";
import type { Locale } from "next-intl";
import { getLocale } from "next-intl/server";

import { getMeDto } from "@/features/auth/api/auth-api.server";
import { mapAuthUser } from "@/features/auth/api/parse-auth-dto";
import { getAccessToken } from "@/features/auth/server/auth-session";
import type { AuthenticatedUser } from "@/features/auth/types/authenticated-user.types";
import { getSafeInternalReturnTo } from "@/features/auth/utils/safe-return-to";
import { redirect } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/api-error";

export const getCurrentUser = cache(
  async (): Promise<AuthenticatedUser | null> => {
    const accessToken = await getAccessToken();
    if (!accessToken) return null;

    try {
      const locale = await getLocale();
      const response = await getMeDto(locale, accessToken);
      return response.success ? mapAuthUser(response.data) : null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
);

export async function requireUser(
  returnTo = "/account/profile",
  redirectLocale?: Locale,
): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (user) return user;

  const locale = redirectLocale ?? (await getLocale());
  return redirect({
    href: {
      pathname: "/login",
      query: { returnTo: getSafeInternalReturnTo(returnTo) },
    },
    locale,
  });
}

// TODO(real auth): Preserve exact nested account returnTo when login/session
// integration provides a documented server-side request-path source.
