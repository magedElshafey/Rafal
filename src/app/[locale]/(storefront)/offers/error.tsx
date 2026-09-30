"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";

export default function OffersError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("Common.offersPage");
  return (
    <Container className="main-content-spacing">
      <ErrorState role="alert" title={t("errorTitle")} description={t("errorDescription")}
        action={<Button onClick={reset}>{t("retry")}</Button>} />
    </Container>
  );
}
