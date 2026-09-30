import { getTranslations } from "next-intl/server";
import { OffersPageSkeleton } from "@/features/offers/components/offers-page-skeleton";

export default async function OffersLoading() {
  const t = await getTranslations("Common.offersPage");
  return <OffersPageSkeleton label={t("loading")} />;
}
