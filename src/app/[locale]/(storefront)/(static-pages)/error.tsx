"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("ContentPages.staticPages");
  return (
    <Container size="narrow" className="main-content-spacing">
      <h1 className="mb-6 text-h1 font-bold">{t("errorTitle")}</h1>
      <ErrorState role="alert" title={t("errorStateTitle")} description={t("errorDescription")}
        action={<Button onClick={reset}>{t("retry")}</Button>} />
    </Container>
  );
}
