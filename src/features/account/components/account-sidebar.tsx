import type { Locale } from "next-intl";

import { ChevronDownIcon } from "@/components/ui/icons";
import { AccountNavigation } from "@/features/account/components/account-navigation";
import { AccountUserSummary } from "@/features/account/components/account-user-summary";
import type { AccountNavigationCopy } from "@/features/account/navigation/account-navigation.types";
import type { AuthenticatedUser } from "@/features/auth/types/authenticated-user.types";

type AccountSidebarProps = {
  copy: AccountNavigationCopy;
  locale: Locale;
  user: AuthenticatedUser;
};

export function AccountSidebar({ copy, locale, user }: AccountSidebarProps) {
  return (
    <>
      <details className="group overflow-hidden rounded-lg border border-gray-200 bg-gray-0 lg:hidden">
        <summary
          aria-label={copy.label}
          className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
        >
          <AccountUserSummary user={user} />
          <ChevronDownIcon
            aria-hidden="true"
            className="me-5 size-5 shrink-0 transition-transform group-open:rotate-180"
          />
        </summary>
        <AccountNavigation copy={copy} locale={locale} />
      </details>

      <aside className="hidden overflow-hidden rounded-lg border border-gray-200 bg-gray-0 lg:block">
        <AccountUserSummary user={user} />
        <AccountNavigation copy={copy} locale={locale} />
      </aside>
    </>
  );
}
