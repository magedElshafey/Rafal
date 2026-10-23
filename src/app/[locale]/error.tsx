"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";

// The locale layout/provider stays mounted. Never render the thrown message.
export default function LocaleError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("Common.feedback");
  return (
    <Container className="py-12">
      <ErrorState role="alert" title={t("errorTitle")} description={t("errorDescription")}
        action={<Button onClick={retry}>{t("retry")}</Button>} />
    </Container>
  );
}
