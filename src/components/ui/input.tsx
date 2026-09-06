import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, disabled, invalid, ...props }, ref) => (
    <input
      ref={ref}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-11 w-full rounded-md border border-gray-200 bg-gray-0 px-3.5 type-body text-gray-1000 outline-none placeholder:text-gray-400",
        "focus:border-[length:var(--border-width-emphasis)] focus:border-gold-500",
        "aria-invalid:border-destructive aria-invalid:focus:border-destructive",
        "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";

export interface InputFieldProps extends Omit<InputProps, "aria-describedby"> {
  id: string;
  label: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  descriptionId?: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      className,
      descriptionId,
      error,
      helperText,
      id,
      label,
      ...props
    },
    ref,
  ) => {
    const message = error ?? helperText;
    const messageId = message ? descriptionId ?? `${id}-description` : undefined;

    return (
      <div className="flex w-full flex-col gap-1.5">
        <label
          htmlFor={id}
          className={cn("type-label text-gray-600", error && "text-destructive")}
        >
          {label}
        </label>
        <Input
          ref={ref}
          id={id}
          invalid={Boolean(error)}
          aria-describedby={messageId}
          className={className}
          {...props}
        />
        {message ? (
          <p
            id={messageId}
            className={cn(
              "type-caption text-gray-600",
              error && "text-destructive",
            )}
          >
            {message}
          </p>
        ) : null}
      </div>
    );
  },
);

InputField.displayName = "InputField";
