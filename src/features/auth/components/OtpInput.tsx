"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";

import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;
const OTP_POSITIONS = ["first", "second", "third", "fourth", "fifth", "sixth"];

type OtpInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "maxLength" | "onChange" | "type" | "value"
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  invalid?: boolean;
};

function normalizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export const OtpInput = forwardRef<HTMLInputElement, OtpInputProps>(
  (
    {
      className,
      defaultValue = "",
      disabled,
      invalid = false,
      onBlur,
      onFocus,
      onKeyDown,
      onValueChange,
      value,
      ...props
    },
    forwardedRef,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [internalValue, setInternalValue] = useState(
      normalizeOtp(defaultValue),
    );
    const [focused, setFocused] = useState(false);
    const [caretIndex, setCaretIndex] = useState(0);
    const currentValue = normalizeOtp(value ?? internalValue);

    useImperativeHandle(
      forwardedRef,
      () => inputRef.current as HTMLInputElement,
    );

    const moveCaret = (nextIndex: number) => {
      const boundedIndex = Math.min(
        Math.max(nextIndex, 0),
        currentValue.length,
      );
      inputRef.current?.setSelectionRange(boundedIndex, boundedIndex);
      setCaretIndex(boundedIndex);
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = normalizeOtp(event.target.value);
      if (value === undefined) setInternalValue(nextValue);
      onValueChange?.(nextValue);
      setCaretIndex(event.target.selectionStart ?? nextValue.length);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        moveCaret(caretIndex + (event.key === "ArrowRight" ? 1 : -1));
      }
    };

    const activeCell = Math.min(caretIndex, OTP_LENGTH - 1);

    return (
      <div
        dir="ltr"
        className={cn("relative grid grid-cols-6 gap-2 sm:gap-3", className)}
      >
        {OTP_POSITIONS.map((position, index) => (
          <span
            key={position}
            aria-hidden="true"
            className={cn(
              "flex h-[var(--otp-cell-height)] min-w-0 items-center justify-center rounded-md border bg-gray-0 text-h4 font-bold text-gray-1000",
              invalid ? "border-destructive" : "border-gray-200",
              focused && activeCell === index && !invalid
                ? "border-[length:var(--border-width-emphasis)] border-gold-500"
                : null,
              disabled && "bg-gray-100 text-gray-400",
            )}
          >
            {currentValue[index] ?? ""}
          </span>
        ))}
        <input
          ref={inputRef}
          {...props}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          value={currentValue}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className="absolute inset-0 size-full cursor-text opacity-0 disabled:cursor-not-allowed"
          onChange={handleChange}
          onSelect={(event) =>
            setCaretIndex(event.currentTarget.selectionStart ?? 0)
          }
          onKeyDown={handleKeyDown}
          onFocus={(event) => {
            setFocused(true);
            setCaretIndex(
              event.currentTarget.selectionStart ?? currentValue.length,
            );
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
      </div>
    );
  },
);

OtpInput.displayName = "OtpInput";
