"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

type OrderDetailsErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function OrderDetailsError({ retry }: OrderDetailsErrorProps) {
  const t = useTranslations("Account.orders.details.error");

  return (
    <ErrorState
      role="alert"
      title={t("title")}
      description={t("description")}
      action={<Button onClick={retry}>{t("retry")}</Button>}
    />
  );
}
