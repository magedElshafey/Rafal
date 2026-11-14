import { getLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { getNotifications } from "@/features/notifications/api/notifications-api.server";

export const metadata = { robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  const locale = await getLocale();
  const [state, t] = await Promise.all([getNotifications(locale), getTranslations("Common.notificationInbox")]);
  return <Container size="narrow" className="main-content-spacing pb-12">
    <h1 className="text-h2 font-bold text-gray-1000">{t("title")}</h1>
    <div role="status" className="mt-6 flex min-h-44 items-center justify-center rounded-lg border border-gray-200 bg-gray-0 p-5 text-center text-gray-700 sm:p-8">
      <p>{t(state)}</p>
    </div>
  </Container>;
}
