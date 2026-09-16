"use client";

import type { Locale } from "next-intl";

import { ArrowLeftIcon } from "@/components/ui/icons";
import { accountNavigationItems } from "@/features/account/navigation/account-navigation-config";
import type { AccountNavigationCopy } from "@/features/account/navigation/account-navigation.types";
import { logoutAccount } from "@/features/auth/actions/logout-account";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type AccountNavigationProps = {
  copy: AccountNavigationCopy;
  locale: Locale;
};

const itemClassName =
  "flex min-h-12 w-full items-center gap-3 px-5 type-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

export function AccountNavigation({ copy, locale }: AccountNavigationProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={copy.label} className="border-t border-gray-200">
      <ul>
        {accountNavigationItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  itemClassName,
                  "hover:bg-gray-50",
                  active && "bg-gold-50 font-bold text-gold-600",
                )}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span>{copy.items[item.key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <form action={logoutAccount} className="border-t border-gray-200">
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className={cn(
            itemClassName,
            "justify-between text-destructive hover:bg-gray-50",
          )}
        >
          <span>{copy.logout}</span>
          <ArrowLeftIcon aria-hidden="true" className="size-5 shrink-0" />
        </button>
      </form>
    </nav>
  );
}
