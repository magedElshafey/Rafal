import { getTranslations } from "next-intl/server";
import type { CategoryNavigationItem } from "@/features/categories/utils/category-navigation";

import MobileBottomNavigationClient, {
  type MobileNavigationCopy,
} from "./MobileBottomNavigationClient";

export default async function MobileBottomNavigation({ categories: categoryData }: {
  categories: CategoryNavigationItem[] | Promise<CategoryNavigationItem[]>;
}) {
  const [t, categories] = await Promise.all([
    getTranslations("Common.nav"),
    categoryData,
  ]);
  const copy: MobileNavigationCopy = {
    about_us: t("about_us"),
    blogs: t("blogs"),
    cart: t("mobile_cart"),
    categories: t("categories"),
    closeMore: t("close_more"),
    home: t("home"),
    more: t("more"),
    moreNavigation: t("more_navigation"),
    moreTitle: t("more_title"),
    navigation: t("mobile_navigation"),
    offers: t("offers"),
    wishlist: t("wishlist"),
    categoryNavigation: {
      title: t("categories"),
      viewAll: t("category_navigation.view_all"),
      viewProducts: t("category_navigation.view_products"),
      back: t("category_navigation.back"),
      close: t("category_navigation.close"),
    },
  };

  return <MobileBottomNavigationClient copy={copy} categories={categories} />;
}
