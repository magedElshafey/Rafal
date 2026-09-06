import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
const AppLogo = async () => {
  const t = await getTranslations("Metadata");
  return <Link href="/">{t("sitename")}</Link>;
};

export default AppLogo;
