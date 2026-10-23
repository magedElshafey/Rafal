"use client";

import { useEffect } from "react";
import { CheckCircle, WarningCircle, Warning } from "@phosphor-icons/react";
import { InfoIcon, XIcon } from "@/components/ui/icons";
import { Toaster, toast } from "sonner";

type RafalToasterProps = {
  direction: "rtl" | "ltr";
  label: string;
  dismissLabel: string;
};

export function RafalToaster({ direction, label, dismissLabel }: RafalToasterProps) {
  // Sonner's store survives route changes. Do not retain old-language notices.
  useEffect(() => () => { toast.dismiss(); }, [direction]);
  return (
    <Toaster
      className="rafal-toaster"
      dir={direction}
      theme="light"
      position={direction === "rtl" ? "top-left" : "top-right"}
      containerAriaLabel={label}
      closeButton
      expand
      visibleToasts={3}
      gap={8}
      offset={{ top: "max(1.5rem, env(safe-area-inset-top))", left: "max(1.5rem, env(safe-area-inset-left))", right: "max(1.5rem, env(safe-area-inset-right))" }}
      mobileOffset={{ top: "max(1rem, env(safe-area-inset-top))", left: "max(1rem, env(safe-area-inset-left))", right: "max(1rem, env(safe-area-inset-right))" }}
      icons={{
        success: <CheckCircle aria-hidden="true" size={20} className="text-success" />,
        error: <WarningCircle aria-hidden="true" size={20} className="text-destructive" />,
        warning: <Warning aria-hidden="true" size={20} className="text-warning" />,
        info: <InfoIcon size={20} className="text-info" />,
        close: <XIcon size={16} />,
      }}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: dismissLabel,
        classNames: {
          toast:
            "rafal-toast flex w-full items-start gap-3 rounded-lg border border-gray-200 bg-gray-0 p-4 pe-14 type-body text-gray-900 shadow-[var(--shadow-toast)]",
          content: "min-w-0 flex-1 text-start",
          title: "break-words font-medium",
          icon: "m-0 shrink-0",
          closeButton: "rafal-toast-dismiss",
        },
      }}
    />
  );
}
