import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { EmailEntryScreen } from "@/features/auth/components/EmailEntryScreen";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { getSafeInternalReturnTo } from "@/features/auth/utils/safe-return-to";
import { redirect } from "@/i18n/navigation";

type LoginPageProps = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const [{ locale }, query, user] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);
  const returnTo = getSafeInternalReturnTo(firstValue(query.returnTo), "/");

  if (user?.profileComplete) redirect({ href: returnTo, locale });
  if (user) {
    redirect({ href: { pathname: "/register", query: { returnTo } }, locale });
  }

  const state = firstValue(query.state);
  const t = await getTranslations("Common.auth.recovery");
  const notice =
    state === "missing-pending-email"
      ? t("missingPendingEmail")
      : state === "session-expired" || state === "authentication-required"
        ? t("signInRequired")
        : undefined;

  return (
    <EmailEntryScreen locale={locale} notice={notice} returnTo={returnTo} />
  );
}
