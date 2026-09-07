import { headerActionItems } from "@/components/shell/storefront/navigation-config";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

type HeaderActionsProps = {
  isAuthenticated?: boolean;
};

const actionLinkClassName =
  "inline-flex size-8 md:size-11 items-center justify-center rounded-full text-foreground transition-colors hover:text-gold-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

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
        {headerActionItems.map((item) => {
          const Icon = item.icon;
          const movesToMobileNavigation =
            item.key === "cart" || item.key === "wishlist";

          return (
            <li
              key={item.href}
              className={cn(movesToMobileNavigation && "hidden md:list-item")}
            >
              <Link
                href={item.href}
                aria-label={t(item.key)}
                className={actionLinkClassName}
              >
                <Icon aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default HeaderActions;
