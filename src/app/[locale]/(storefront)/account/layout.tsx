import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { AccountSidebar } from "@/features/account/components/account-sidebar";
import type { AccountNavigationCopy } from "@/features/account/navigation/account-navigation.types";
import { requireUser } from "@/features/auth/server/auth-boundary";

type AccountLayoutProps = {
  children: ReactNode;
};

export default async function AccountLayout({ children }: AccountLayoutProps) {
  const [user, t] = await Promise.all([
    requireUser(),
    getTranslations("Account.navigation"),
  ]);
  const navigationCopy: AccountNavigationCopy = {
    label: t("label"),
    logout: t("logout"),
    unavailable: t("unavailable"),
    items: {
      profile: t("profile"),
      orders: t("orders"),
      addresses: t("addresses"),
      wishlist: t("wishlist"),
      loyalty: t("loyalty"),
      settings: t("settings"),
    },
  };

  return (
    <Container size="wide" className="pb-12 md:pb-16">
      <div className="grid items-start gap-6 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-8">
        <AccountSidebar copy={navigationCopy} user={user} />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
