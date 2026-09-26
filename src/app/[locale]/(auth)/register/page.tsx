import type { Locale } from "next-intl";

import { CompleteProfileScreen } from "@/features/auth/components/CompleteProfileScreen";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { getSafeInternalReturnTo } from "@/features/auth/utils/safe-return-to";
import { getGuestCartToken } from "@/features/cart/server/guest-cart-session";
import { redirect } from "@/i18n/navigation";

type RegisterPageProps = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function RegisterPage({
  params,
  searchParams,
}: RegisterPageProps) {
  const [{ locale }, query, user, guestCartToken] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
    getGuestCartToken(),
  ]);
  const returnTo = getSafeInternalReturnTo(firstValue(query.returnTo), "/");

  if (!user) {
    return redirect({
      href: {
        pathname: "/login",
        query: { returnTo, state: "authentication-required" },
      },
      locale,
    });
  }
  if (user.profileComplete) {
    redirect({
      href: guestCartToken
        ? { pathname: "/auth/cart-recovery", query: { returnTo } }
        : returnTo,
      locale,
    });
  }

  return <CompleteProfileScreen locale={locale} returnTo={returnTo} />;
}
