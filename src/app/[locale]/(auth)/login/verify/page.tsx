import type { Locale } from "next-intl";

import { OtpVerificationScreen } from "@/features/auth/components/OtpVerificationScreen";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { getPendingOtpEmail } from "@/features/auth/server/auth-session";
import { getSafeInternalReturnTo } from "@/features/auth/utils/safe-return-to";
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
  const [{ locale }, query, user, pendingEmail] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
    getPendingOtpEmail(),
  ]);
  const returnTo = getSafeInternalReturnTo(firstValue(query.returnTo), "/");

  if (user?.profileComplete) redirect({ href: returnTo, locale });
  if (user) {
    redirect({ href: { pathname: "/register", query: { returnTo } }, locale });
  }
  if (!pendingEmail) {
    redirect({
      href: {
        pathname: "/login",
        query: { returnTo, state: "missing-pending-email" },
      },
      locale,
    });
  }

  return <OtpVerificationScreen locale={locale} returnTo={returnTo} />;
}
