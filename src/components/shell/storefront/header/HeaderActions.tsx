import {
  BellIcon,
  HeartIcon,
  ShoppingBagIcon,
  UserIcon,
} from "@/components/ui/icons";

import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

type HeaderActionsProps = {
  isAuthenticated?: boolean;
};

const actionLinkClassName =
  "inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:text-gold-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const HeaderActions = async ({
  isAuthenticated = true,
}: HeaderActionsProps) => {
  const t = await getTranslations("Common.nav");

  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className="rounded-sm type-card-price font-medium text-gold-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {t("login")}
      </Link>
    );
  }

  return (
    <nav aria-label={t("user_navigation")}>
      <ul className="flex items-center gap-1 sm:gap-2">
        <li>
          <Link
            href="/notifications"
            aria-label={t("notifications")}
            className={actionLinkClassName}
          >
            <BellIcon />
          </Link>
        </li>

        <li>
          <Link
            href="/wishlist"
            aria-label={t("wishlist")}
            className={actionLinkClassName}
          >
            <HeartIcon />
          </Link>
        </li>

        <li>
          <Link
            href="/cart"
            aria-label={t("cart")}
            className={actionLinkClassName}
          >
            <ShoppingBagIcon />
          </Link>
        </li>

        <li>
          <Link
            href="/my-profile"
            aria-label={t("profile")}
            className={actionLinkClassName}
          >
            <UserIcon />
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default HeaderActions;
