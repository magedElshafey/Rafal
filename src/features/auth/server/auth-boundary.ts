import "server-only";

import { cache } from "react";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";

import { serverEnv } from "@/config/server-env";
import { mockAuthenticatedUser } from "@/features/auth/server/mock-auth-user";
import type { AuthenticatedUser } from "@/features/auth/types/authenticated-user.types";
import { getSafeInternalReturnTo } from "@/features/auth/utils/safe-return-to";
import { redirect } from "@/i18n/navigation";

export const MOCK_AUTH_GUEST_COOKIE_NAME = "rafal_mock_auth_guest";

export const getCurrentUser = cache(
  async (): Promise<AuthenticatedUser | null> => {
    if (!serverEnv.useMockAuth || serverEnv.mockAuthState === "guest") {
      return null;
    }

    const cookieStore = await cookies();
    if (cookieStore.get(MOCK_AUTH_GUEST_COOKIE_NAME)?.value === "1") {
      return null;
    }

    return mockAuthenticatedUser;
  },
);

export async function requireUser(
  returnTo = "/account/profile",
): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (user) return user;

  const locale = await getLocale();
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
