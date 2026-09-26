import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { PostAuthCartMergeRecovery } from "@/features/auth/components/PostAuthCartMergeRecovery";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { getSafeInternalReturnTo } from "@/features/auth/utils/safe-return-to";
import { getGuestCartToken } from "@/features/cart/server/guest-cart-session";
import { redirect } from "@/i18n/navigation";

type CartRecoveryPageProps = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function CartRecoveryPage({
  params,
  searchParams,
}: CartRecoveryPageProps) {
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
  if (!user.profileComplete) {
    return redirect({
      href: { pathname: "/register", query: { returnTo } },
      locale,
    });
  }
  if (!guestCartToken) redirect({ href: returnTo, locale });

  const t = await getTranslations("Common.auth");
  return (
    <PostAuthCartMergeRecovery
      locale={locale}
      returnTo={returnTo}
      copy={{
        error: t("errors.cartMergeUnavailable"),
        retry: t("cartMerge.retry"),
        retrying: t("cartMerge.retrying"),
      }}
    />
  );
}
