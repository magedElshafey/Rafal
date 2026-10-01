import type { HTMLAttributes, LabelHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

// IDs, descriptions, required copy, and announcement timing belong to callers.
export function Field({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex w-full min-w-0 flex-col gap-1.5", className)} {...props} />;
}

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("type-label text-gray-600", className)} {...props} />;
}

export function FieldDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("type-caption text-gray-600", className)} {...props} />;
}

export function FieldError({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("type-caption text-destructive", className)} {...props} />;
}
