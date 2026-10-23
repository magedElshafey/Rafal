"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ConfirmDialog, InfoDialog } from "@/components/ui/rafal-modal";
import { useRafalToast } from "@/lib/rafal-toast";

export default function FoundationReviewPage() {
  const rafalToast = useRafalToast();
  const t = useTranslations("Common.feedback.review");
  const [dialog, setDialog] = useState<"info" | "confirm" | null>(null);

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => setDialog("info")}>{t("info")}</Button>
      <Button onClick={() => setDialog("confirm")}>{t("confirm")}</Button>
      <Button onClick={() => rafalToast.success(t("successMessage"))}>{t("success")}</Button>
      <Button onClick={() => rafalToast.error(t("errorMessage"))}>{t("error")}</Button>
      <Button onClick={() => rafalToast.warning(t("warningMessage"))}>{t("warning")}</Button>
      <Button onClick={() => rafalToast.info(t("infoMessage"))}>{t("notification")}</Button>
      <InfoDialog
        open={dialog === "info"}
        onOpenChange={(open) => setDialog(open ? "info" : null)}
        title={t("info")}
        description={t("successMessage")}
        actionLabel={t("okay")}
      />
      <ConfirmDialog
        open={dialog === "confirm"}
        onOpenChange={(open) => setDialog(open ? "confirm" : null)}
        title={t("confirm")}
        description={t("confirmMessage")}
        confirmLabel={t("confirm")}
        cancelLabel={t("cancel")}
        onConfirm={() => setDialog(null)}
      />
    </div>
  );
}
