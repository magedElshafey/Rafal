import type { AppLinks } from "@/components/shell/storefront/header/ListLinks";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
type AppLinkProps = { item: AppLinks };
const AppLink = async ({ item }: AppLinkProps) => {
  const t = await getTranslations("Common");
  return (
    <li>
      <Link href={item.path}>{t(item.title)}</Link>
    </li>
  );
};

export default AppLink;
