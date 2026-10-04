"use client";

import { useRef, useState } from "react";
import type { Locale } from "next-intl";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/rafal-modal";
import { cancelOrderFromBrowser } from "@/features/orders/api/cancel-order";
import { useRouter } from "@/i18n/navigation";
import { rafalToast } from "@/lib/rafal-toast";

export type CancelOrderCopy = Readonly<{
  action: string;
  cancel: string;
  confirm: string;
  description: string;
  error: string;
  loading: string;
  success: string;
  title: string;
}>;

type CancelOrderActionProps = {
  copy: CancelOrderCopy;
  locale: Locale;
  orderNumber: string;
};

export function CancelOrderAction({
  copy,
  locale,
  orderNumber,
}: CancelOrderActionProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const submissionPendingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (submissionPendingRef.current) return;
    setOpen(nextOpen);
    if (!nextOpen) setError(null);
  };

  const handleConfirm = async () => {
    if (submissionPendingRef.current) return;
    submissionPendingRef.current = true;
    setPending(true);
    setError(null);

    try {
      await cancelOrderFromBrowser(locale, orderNumber);
      setOpen(false);
      rafalToast.success(copy.success);
      router.refresh();
    } catch {
      setError(copy.error);
      router.refresh();
    } finally {
      submissionPendingRef.current = false;
      setPending(false);
    }
  };

  return (
    <>
      <Button
        ref={triggerRef}
        variant="outline"
        className="w-full border-destructive text-destructive sm:w-auto"
        onClick={() => setOpen(true)}
      >
        {copy.action}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={handleOpenChange}
        returnFocusRef={triggerRef}
        title={copy.title}
        description={copy.description}
        confirmLabel={copy.confirm}
        cancelLabel={copy.cancel}
        onConfirm={handleConfirm}
        loading={pending}
        loadingLabel={copy.loading}
        dismissible={!pending}
        destructive
      >
        {error ? (
          <p role="alert" className="type-body-sm text-destructive">
            {error}
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
