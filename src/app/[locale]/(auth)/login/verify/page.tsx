import type { Locale } from "next-intl";

import { OtpVerificationScreen } from "@/features/auth/components/OtpVerificationScreen";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { getPendingOtpPhone } from "@/features/auth/server/auth-session";
import { getSafeInternalReturnTo } from "@/features/auth/utils/safe-return-to";
import { getGuestCartToken } from "@/features/cart/server/guest-cart-session";
import { redirect } from "@/i18n/navigation";

type OtpVerificationPageProps = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function OtpVerificationPage({
  params,
  searchParams,
}: OtpVerificationPageProps) {
  const [{ locale }, query, user, pendingPhone, guestCartToken] =
    await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
    getPendingOtpPhone(),
    getGuestCartToken(),
  ]);
  const returnTo = getSafeInternalReturnTo(firstValue(query.returnTo), "/");

  if (user?.profileComplete) {
    redirect({
      href: guestCartToken
        ? { pathname: "/auth/cart-recovery", query: { returnTo } }
        : returnTo,
      locale,
    });
  }
  if (user) {
    redirect({ href: { pathname: "/register", query: { returnTo } }, locale });
  }
  if (!pendingPhone) {
    redirect({
      href: {
        pathname: "/login",
        query: { returnTo, state: "missing-pending-phone" },
      },
      locale,
    });
  }

  return <OtpVerificationScreen locale={locale} returnTo={returnTo} />;
}
