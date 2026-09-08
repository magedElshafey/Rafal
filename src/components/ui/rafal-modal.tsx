"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type RafalModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
  closeLabel?: string;
  showClose?: boolean;
  className?: string;
};

export function RafalModal({
  children,
  className,
  closeLabel = "Close",
  description,
  dismissible = true,
  footer,
  onOpenChange,
  open,
  showClose = false,
  title,
}: RafalModalProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen || dismissible) onOpenChange(nextOpen);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-gray-1000/45" />
        <DialogPrimitive.Content
          onEscapeKeyDown={(event) => {
            if (!dismissible) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (!dismissible) event.preventDefault();
          }}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-y-auto rounded-t-xl bg-gray-0 px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-modal)] outline-none",
            "sm:inset-x-auto sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:w-[calc(100%-2rem)] sm:max-w-[var(--modal-max-width)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-6",
            className,
          )}
        >
          {showClose && dismissible ? (
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className="absolute top-4 end-4 inline-flex size-8 items-center justify-center rounded-md text-gray-600 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <XIcon aria-hidden="true" className="size-4" />
            </DialogPrimitive.Close>
          ) : null}
          <div className={cn("space-y-3", showClose && "pe-8")}>
            <DialogPrimitive.Title className="text-h4 font-bold text-gray-1000">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="type-body text-gray-600">
                {description}
              </DialogPrimitive.Description>
            ) : null}
            {children}
          </div>
          {footer ? (
            <div className="mt-4 flex flex-wrap gap-2">{footer}</div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type InfoDialogProps = Omit<RafalModalProps, "children" | "footer"> & {
  actionLabel: string;
};

export function InfoDialog({
  actionLabel,
  onOpenChange,
  ...props
}: InfoDialogProps) {
  return (
    <RafalModal
      {...props}
      onOpenChange={onOpenChange}
      footer={
        <Button size="sm" onClick={() => onOpenChange(false)}>
          {actionLabel}
        </Button>
      }
    />
  );
}

type ConfirmDialogProps = Omit<RafalModalProps, "children" | "footer"> & {
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  loadingLabel?: string;
  destructive?: boolean;
};

export function ConfirmDialog({
  cancelLabel,
  confirmLabel,
  destructive = false,
  loading = false,
  loadingLabel,
  onConfirm,
  onOpenChange,
  ...props
}: ConfirmDialogProps) {
  return (
    <RafalModal
      {...props}
      onOpenChange={onOpenChange}
      footer={
        <>
          <Button
            size="sm"
            loading={loading}
            loadingLabel={loadingLabel}
            className={cn(destructive && "bg-destructive")}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
        </>
      }
    />
  );
}
