import { getTranslations } from "next-intl/server";
import { AboutUsSkeleton } from "@/features/about/components/about-us-skeleton";

export default async function AboutUsLoading() {
  const t = await getTranslations("ContentPages.about");
  return <AboutUsSkeleton label={t("loading")} />;
}
