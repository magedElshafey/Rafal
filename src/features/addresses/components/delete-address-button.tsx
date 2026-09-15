"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/rafal-modal";
import { deleteAddress } from "@/features/addresses/actions/address-actions";
import { rafalToast } from "@/lib/rafal-toast";

export type DeleteAddressCopy = {
  trigger: string;
  title: string;
  description: string;
  confirm: string;
  confirming: string;
  cancel: string;
  deletedPreview: string;
  defaultUnsupported: string;
  error: string;
};

type DeleteAddressButtonProps = {
  addressId: string;
  copy: DeleteAddressCopy;
};

export function DeleteAddressButton({
  addressId,
  copy,
}: DeleteAddressButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        const result = await deleteAddress(addressId);
        if (!result.ok) {
          rafalToast.error(
            result.reason === "default-address-delete-unsupported"
              ? copy.defaultUnsupported
              : copy.error,
          );
          return;
        }

        handleOpenChange(false);
        rafalToast.success(copy.deletedPreview);
      } catch {
        rafalToast.error(copy.error);
      }
    });
  };

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="sm"
        className="h-11 px-0 text-destructive"
        onClick={() => setOpen(true)}
      >
        {copy.trigger}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={handleOpenChange}
        title={copy.title}
        description={copy.description}
        confirmLabel={copy.confirm}
        loading={pending}
        loadingLabel={copy.confirming}
        cancelLabel={copy.cancel}
        onConfirm={handleConfirm}
        destructive
      />
    </>
  );
}
