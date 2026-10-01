import { forwardRef, type TextareaHTMLAttributes } from "react";

import { formControlStyles } from "@/components/ui/form-control-styles";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(formControlStyles, "min-h-30 resize-y py-3", className)}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
