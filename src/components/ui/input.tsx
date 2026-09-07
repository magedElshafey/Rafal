import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

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
    { className, descriptionId, error, helperText, id, label, ...props },
    ref,
  ) => {
    const message = error ?? helperText;
    const messageId = message
      ? (descriptionId ?? `${id}-description`)
      : undefined;

    return (
      <div className="flex w-full flex-col gap-1.5">
        <label
          htmlFor={id}
          className={cn(
            "type-label text-gray-600",
            error && "text-destructive",
          )}
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

export interface PhoneInputFieldProps extends Omit<
  InputProps,
  "aria-describedby" | "children" | "dir" | "type"
> {
  id: string;
  label: ReactNode;
  countryCode: ReactNode;
  countryFlag: ReactNode;
  error?: ReactNode;
  descriptionId?: string;
}

export const PhoneInputField = forwardRef<
  HTMLInputElement,
  PhoneInputFieldProps
>(
  (
    {
      className,
      countryCode,
      countryFlag,
      descriptionId,
      disabled,
      error,
      id,
      label,
      ...props
    },
    ref,
  ) => {
    const messageId = error
      ? (descriptionId ?? `${id}-description`)
      : undefined;

    return (
      <div className="flex w-full flex-col gap-1.5">
        <label
          htmlFor={id}
          className={cn(
            "type-label text-gray-600",
            error && "text-destructive",
          )}
        >
          {label}
        </label>
        <div
          dir="ltr"
          className={cn(
            "flex h-11 w-full items-center overflow-hidden rounded-md border border-gray-200 bg-gray-0",
            "focus-within:border-[length:var(--border-width-emphasis)] focus-within:border-gold-500",
            error && "border-destructive focus-within:border-destructive",
            disabled && "cursor-not-allowed bg-gray-100 text-gray-400",
          )}
        >
          <span className="flex h-full w-[var(--phone-input-prefix-width)] shrink-0 items-center gap-1 px-2.5 ps-3">
            <span
              aria-hidden="true"
              className="flex h-[var(--phone-input-flag-height)] w-[var(--phone-input-flag-width)] shrink-0"
            >
              {countryFlag}
            </span>
            <bdi className="type-body font-normal text-gray-1000">
              {countryCode}
            </bdi>
          </span>
          <span
            aria-hidden="true"
            className="h-[var(--phone-input-divider-height)] w-px shrink-0 bg-gray-200"
          />
          <input
            ref={ref}
            id={id}
            type="tel"
            inputMode="tel"
            disabled={disabled}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={messageId}
            className={cn(
              "h-full min-w-0 flex-1 bg-transparent px-2.5 type-body text-gray-1000 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:text-gray-400",
              className,
            )}
            {...props}
          />
        </div>
        {error ? (
          <p id={messageId} className="type-caption text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

PhoneInputField.displayName = "PhoneInputField";
