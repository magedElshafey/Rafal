"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";

export default function BlogPostError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("ContentPages.blog");
  return (
    <Container className="main-content-spacing">
      <ErrorState role="alert" title={t("detailErrorTitle")} description={t("detailErrorDescription")}
        action={<Button onClick={reset}>{t("retry")}</Button>} />
    </Container>
  );
}
