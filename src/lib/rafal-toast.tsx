"use client";

import type { ReactNode } from "react";
import { toast, type ExternalToast } from "sonner";

type ToastOptions = Pick<
  ExternalToast,
  "duration" | "id" | "onAutoClose" | "onDismiss"
>;

const statusDot = (className: string) => (
  <span aria-hidden="true" className={`size-2 rounded-full ${className}`} />
);

export const rafalToast = {
  success(message: ReactNode, options?: ToastOptions) {
    return toast.success(message, {
      ...options,
      icon: statusDot("bg-success"),
    });
  },
  error(message: ReactNode, options?: ToastOptions) {
    return toast.error(message, {
      ...options,
      icon: statusDot("bg-destructive"),
    });
  },
  info(message: ReactNode, options?: ToastOptions) {
    return toast.info(message, {
      ...options,
      icon: statusDot("bg-info"),
    });
  },
  dismiss(id?: string | number) {
    return toast.dismiss(id);
  },
};
