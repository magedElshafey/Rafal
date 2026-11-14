"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { ShoppingBagIcon } from "@/components/ui/icons/interface-icons";
import { currentCartQueryOptions } from "@/features/cart/api/cart-query";
import type { CartSnapshot } from "@/features/cart/types/cart.types";
import { Link, usePathname } from "@/i18n/navigation";

const selectQuantity = (cart: CartSnapshot) => cart.summary.totalQuantity;

export function CartNavigationLink({
  className,
  mobile = false,
}: {
  className: string;
  mobile?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("Common.nav");
  const pathname = usePathname();
  // Both shell variants share the existing canonical query and mutation writes.
  // No city projection is needed to count quantities already in the Cart.
  const { data: count } = useQuery({
    ...currentCartQueryOptions(locale, null),
    select: selectQuantity,
  });
  const formatter = new Intl.NumberFormat(locale);

  return (
    <Link
      href="/cart"
      aria-current={pathname === "/cart" ? "page" : undefined}
      aria-label={count === undefined ? t("cart") : t("cartCount", { count: formatter.format(count) })}
      className={className}
    >
      <span className="relative inline-flex shrink-0">
        <ShoppingBagIcon aria-hidden="true" className={mobile ? "size-[var(--mobile-bottom-navigation-icon-size)]" : undefined} />
        {count !== undefined && count > 0 ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -end-2 bottom-full -mb-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 type-badge font-medium text-gray-0"
          >
            <bdi dir="ltr">{count > 9 ? `${formatter.format(9)}+` : formatter.format(count)}</bdi>
          </span>
        ) : null}
      </span>
      {mobile ? <span className="max-w-full truncate px-0.5">{t("mobile_cart")}</span> : null}
    </Link>
  );
}
