"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";

export default function BlogPostError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("ContentPages.blog");
  return (
    <Container className="main-content-spacing">
      <ErrorState role="alert" title={t("detailErrorTitle")} description={t("detailErrorDescription")}
        action={<Button onClick={retry}>{t("retry")}</Button>} />
    </Container>
  );
}
