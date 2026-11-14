import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default async function NotificationsLoading() {
  const t = await getTranslations("Common.notificationInbox");
  return <Container size="narrow" className="main-content-spacing pb-12" aria-busy="true" aria-label={t("loading")}>
    <h1 className="text-h2 font-bold text-gray-1000">{t("title")}</h1>
    <div className="mt-6 flex min-h-44 items-center justify-center rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-8">
      <Skeleton className="h-5 w-64 max-w-full" />
    </div>
  </Container>;
}
