import { getTranslations } from "next-intl/server";

import MobileBottomNavigationClient, {
  type MobileNavigationCopy,
} from "./MobileBottomNavigationClient";

export default async function MobileBottomNavigation() {
  const t = await getTranslations("Common.nav");
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
  };

  return <MobileBottomNavigationClient copy={copy} />;
}
