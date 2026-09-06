import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
const Productpage = () => {
  const t = useTranslations("Home");
  return (
    <div className="flex flex-col gap-4">
      <Link href="/products">{t("productNavigate")}</Link>
      <LocaleSwitcher />
    </div>
  );
};

export default Productpage;
