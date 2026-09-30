import { getTranslations } from "next-intl/server";
import { StaticPageSkeleton } from "@/features/static-pages/components/static-page-skeleton";

export default async function Loading() {
  const t = await getTranslations("ContentPages.staticPages");
  return <StaticPageSkeleton label={t("loading")} />;
}
