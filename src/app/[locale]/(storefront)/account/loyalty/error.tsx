"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

export default function LoyaltyError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("Account.loyalty");
  return (
    <div>
      <h1 className="text-h2 font-bold text-gray-1000">{t("title")}</h1>
      <ErrorState className="mt-6" role="alert" title={t("error.title")} description={t("error.description")} action={<Button onClick={retry}>{t("error.retry")}</Button>} />
    </div>
  );
}
