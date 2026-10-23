"use client";

import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { toast, type ExternalToast } from "sonner";

type ToastOptions = Pick<
  ExternalToast,
  "duration" | "id" | "onAutoClose" | "onDismiss"
>;

// Independent notifications get Sonner IDs. Repeated updates to one logical
// operation must opt in with an explicit ID; message text is never identity.
function optionsFor(kind: string, options?: ToastOptions) {
  return {
    duration: kind === "error" || kind === "warning" ? 8000 : 5000,
    ...options,
  };
}

export const rafalToast = {
  success(message: ReactNode, options?: ToastOptions) {
    return toast.success(message, optionsFor("success", options));
  },
  error(message: ReactNode, options?: ToastOptions) {
    return toast.error(message, optionsFor("error", options));
  },
  info(message: ReactNode, options?: ToastOptions) {
    return toast.info(message, optionsFor("info", options));
  },
  warning(message: ReactNode, options?: ToastOptions) {
    return toast.warning(message, optionsFor("warning", options));
  },
  dismiss(id?: string | number) {
    return toast.dismiss(id);
  },
};

// Async work may finish after a locale navigation. Suppress that stale copy;
// current callers resolve their feature translations when presenting feedback.
export function useRafalToast() {
  const locale = useLocale();
  const active = () => document.documentElement.lang === locale;
  return {
    success: (message: ReactNode, options?: ToastOptions) => active() ? rafalToast.success(message, options) : undefined,
    error: (message: ReactNode, options?: ToastOptions) => active() ? rafalToast.error(message, options) : undefined,
    warning: (message: ReactNode, options?: ToastOptions) => active() ? rafalToast.warning(message, options) : undefined,
    info: (message: ReactNode, options?: ToastOptions) => active() ? rafalToast.info(message, options) : undefined,
    dismiss: rafalToast.dismiss,
  };
}
