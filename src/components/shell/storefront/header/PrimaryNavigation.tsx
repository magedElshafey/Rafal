import NavigationLink from "@/components/shell/storefront/header/NavigationLink";
import { primaryNavigationItems } from "@/components/shell/storefront/navigation-config";
import { getTranslations } from "next-intl/server";

const PrimaryNavigation = async () => {
  const t = await getTranslations("Common.nav");

  return (
    <nav aria-label={t("main_navigation")} className="hidden md:block">
      <ul className="flex items-center gap-4 sm:gap-5">
        {primaryNavigationItems.map((item) => (
          <li key={item.href}>
            <NavigationLink
              href={item.href}
              label={t(item.key)}
              match={item.match}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default PrimaryNavigation;
