import { getLocalizedAlternates } from "@/lib/seo/alternates";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({
    locale,
    namespace: "Metadata.ProductsPage",
  });
  return {
    title: t("title"),
    alternates: getLocalizedAlternates(locale, "/products"),
  };
}
const page = () => {
  return <div>page</div>;
};

export default page;
