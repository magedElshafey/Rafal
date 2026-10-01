import NavigationLink from "@/components/shell/storefront/header/NavigationLink";
import { primaryNavigationItems } from "@/components/shell/storefront/navigation-config";
import { getTranslations } from "next-intl/server";
import type { CategoryNavigationItem } from "@/features/categories/utils/category-navigation";
import { DesktopCategoryNavigation } from "./DesktopCategoryNavigation";

const PrimaryNavigation = async ({ categories: categoryData }: {
  categories: CategoryNavigationItem[] | Promise<CategoryNavigationItem[]>;
}) => {
  const [t, categories] = await Promise.all([
    getTranslations("Common.nav"),
    categoryData,
  ]);

  return (
    <nav data-desktop-navigation aria-label={t("main_navigation")} className="hidden md:block">
      <ul className="flex items-center gap-4 sm:gap-5">
        {primaryNavigationItems.map((item) => (
          <li key={item.href}>
            {item.key === "categories" && categories.length > 0 ? (
              <DesktopCategoryNavigation
                categories={categories}
                copy={{
                  title: t("categories"),
                  viewAll: t("category_navigation.view_all"),
                  viewProducts: t("category_navigation.view_products"),
                  back: t("category_navigation.back"),
                  close: t("category_navigation.close"),
                }}
              />
            ) : <NavigationLink
              href={item.href}
              label={t(item.key)}
              match={item.match}
            />}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default PrimaryNavigation;
