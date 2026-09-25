"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";

type CatalogueListingErrorProps = {
  retry: () => void;
};

export function CatalogueListingError({ retry }: CatalogueListingErrorProps) {
  const t = useTranslations("Common.productListing");

  return (
    <Container className="main-content-spacing">
      <ErrorState
        role="alert"
        title={t("initialErrorTitle")}
        description={t("initialErrorDescription")}
        action={<Button onClick={retry}>{t("retry")}</Button>}
      />
    </Container>
  );
}
