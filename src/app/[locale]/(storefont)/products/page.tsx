import { getLocalizedAlternates } from "@/lib/seo/alternates";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    locale: string;
  }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "Metadata.ProductsPage",
  });
  return {
    title: t("title"),
    alternates: getLocalizedAlternates(locale as "ar" | "en", "/products"),
  };
}
const page = () => {
  return <div>page</div>;
};

export default page;
