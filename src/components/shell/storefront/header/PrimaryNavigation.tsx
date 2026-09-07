import NavigationLink from "@/components/shell/storefront/header/NavigationLink";
import { getTranslations } from "next-intl/server";

export type AppLinkItem = {
  title: string;
  path: string;
};

const links = [
  {
    title: "home",
    path: "/",
  },
  {
    title: "categories",
    path: "/categories",
  },
  {
    title: "offers",
    path: "/offers",
  },
  {
    title: "about_us",
    path: "/about-us",
  },
  {
    title: "blogs",
    path: "/blogs",
  },
] satisfies readonly AppLinkItem[];

const PrimaryNavigation = async () => {
  const t = await getTranslations("Common.nav");

  return (
    <nav aria-label={t("main_navigation")} className="hidden md:block">
      <ul className="flex items-center gap-8">
        {links.map((link) => (
          <li key={link.path}>
            <NavigationLink href={link.path} label={t(link.title)} />
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default PrimaryNavigation;
