"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export default function NotificationsError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("Common.notificationInbox");
  return <Container size="narrow" className="main-content-spacing pb-12">
    <h1 className="text-h2 font-bold text-gray-1000">{t("title")}</h1>
    <div role="alert" className="mt-6 flex min-h-44 flex-col items-center justify-center gap-4 rounded-lg border border-gray-200 bg-gray-0 p-5 text-center sm:p-8">
      <p>{t("error")}</p>
      <Button onClick={retry}>{t("retry")}</Button>
    </div>
  </Container>;
}
