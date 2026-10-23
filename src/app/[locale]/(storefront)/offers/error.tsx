"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";

export default function OffersError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("Common.offersPage");
  return (
    <Container className="main-content-spacing">
      <ErrorState role="alert" title={t("errorTitle")} description={t("errorDescription")}
        action={<Button onClick={retry}>{t("retry")}</Button>} />
    </Container>
  );
}
