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
  return <p className={cn("type-body-sm break-words text-destructive", className)} {...props} />;
}

// Invisible copies participate in intrinsic grid sizing but never in the
// accessibility tree. Reserve actual localized alternatives, not fixed heights:
// wrapping, zoom, and longer translations all retain their natural dimensions.
export function FieldFeedback({
  children,
  reserve = [],
  className,
  role,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { reserve?: readonly string[] }) {
  return (
    <div className={cn("grid min-w-0 text-start type-body-sm break-words", className)}>
      {reserve.filter((message) => typeof message === "string" && message.length > 0).map((message, index) => (
        <p key={index} aria-hidden="true" className="invisible col-start-1 row-start-1 select-none">
          {message}
        </p>
      ))}
      <FieldError className={cn("col-start-1 row-start-1", role === "alert" && "font-medium")} role={role} {...props}>{children}</FieldError>
    </div>
  );
}
