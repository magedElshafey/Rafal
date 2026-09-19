"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

type ProductErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function ProductError({ retry }: ProductErrorProps) {
  const t = useTranslations("Common.productDetails.route");

  return (
    <Container className="main-content-spacing">
      <div
        role="alert"
        className="flex flex-col items-center rounded-lg border border-gray-200 bg-gray-50 p-6 text-center sm:p-8"
      >
        <h1 className="text-h3 font-bold text-gray-1000">
          {t("errorTitle")}
        </h1>
        <p className="mt-2 max-w-xl type-body text-gray-600">
          {t("errorDescription")}
        </p>
        <Button className="mt-4" onClick={retry}>
          {t("retry")}
        </Button>
      </div>
    </Container>
  );
}
