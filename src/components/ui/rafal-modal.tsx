"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRef, type ReactNode, type RefObject } from "react";

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
  returnFocusRef?: RefObject<HTMLElement | null>;
  variant?: "modal" | "bottom-sheet" | "image-viewer";
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
  returnFocusRef,
  showClose = false,
  title,
  variant = "modal",
}: RafalModalProps) {
  const isImageViewer = variant === "image-viewer";
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen || dismissible) onOpenChange(nextOpen);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "motion-surface-overlay fixed inset-0 z-50",
            isImageViewer ? "bg-gray-1000/80" : "bg-gray-1000/45",
          )}
        />
        <DialogPrimitive.Content
          ref={contentRef}
          // The viewer reuses the existing responsive modal motion lifecycle.
          data-surface={isImageViewer ? "modal" : variant}
          onOpenAutoFocus={() => {
            const activeElement = document.activeElement;
            previousFocusRef.current =
              activeElement instanceof HTMLElement ? activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            const target = returnFocusRef?.current ?? previousFocusRef.current;
            if (!target?.isConnected) return;

            event.preventDefault();
            target.focus();
          }}
          // Radix releases its focus trap at open=false, before Presence unmounts.
          // Keep focus inside the still-visible exit surface; restore it on unmount.
          onFocusOutside={(event) => {
            if (open) return;
            event.preventDefault();
            contentRef.current?.focus();
          }}
          onClickCapture={(event) => {
            if (open) return;
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerDownCapture={(event) => {
            if (open) return;
            event.preventDefault();
            event.stopPropagation();
          }}
          onKeyDownCapture={(event) => {
            if (open || event.key === "Tab") return;
            event.preventDefault();
            event.stopPropagation();
          }}
          onEscapeKeyDown={(event) => {
            if (!dismissible) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (!dismissible) event.preventDefault();
          }}
          className={cn(
            "motion-surface fixed z-50 outline-none",
            isImageViewer
              ? "inset-0 h-dvh overflow-hidden bg-gray-100 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] sm:inset-4 sm:h-[calc(100dvh-2rem)] sm:rounded-lg"
              : cn(
                  "inset-x-0 bottom-0 max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-y-auto rounded-t-xl bg-gray-0 px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-modal)]",
                  variant === "bottom-sheet"
                    ? "sm:inset-x-auto sm:left-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2"
                    : "sm:inset-x-auto sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:w-[calc(100%-2rem)] sm:max-w-[var(--modal-max-width)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-6",
                ),
            className,
          )}
        >
          {showClose && dismissible ? (
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className={cn(
                "absolute inline-flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isImageViewer
                  ? "top-[max(1rem,env(safe-area-inset-top))] end-[max(1rem,env(safe-area-inset-right))] z-10 size-12 rounded-full border border-gray-200 bg-gray-0 text-gray-1000 transition-opacity hover:opacity-90 motion-reduce:transition-none rtl:end-[max(1rem,env(safe-area-inset-left))]"
                  : "top-4 end-4 size-8 rounded-md text-gray-600 hover:bg-gray-100",
              )}
            >
              <XIcon
                aria-hidden="true"
                className={
                  isImageViewer ? "size-[var(--icon-button-art-lg)]" : "size-4"
                }
              />
            </DialogPrimitive.Close>
          ) : null}
          <div
            className={
              isImageViewer ? "h-full min-h-0" : cn("space-y-3", showClose && "pe-8")
            }
          >
            <DialogPrimitive.Title
              className={isImageViewer ? "sr-only" : "text-h4 font-bold text-gray-1000"}
            >
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
