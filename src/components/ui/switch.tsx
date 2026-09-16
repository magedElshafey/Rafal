"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type SwitchProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked,
      className,
      disabled,
      onCheckedChange,
      onClick,
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      {...props}
      type={type}
      role="switch"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-gray-300 p-0.5 outline-none transition-colors motion-reduce:transition-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=checked]:bg-gold-500 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:opacity-80",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onCheckedChange?.(!checked);
      }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0.5 block size-5 rounded-full bg-gray-0 shadow-sm transition-transform motion-reduce:transition-none",
          checked && "translate-x-5",
        )}
      />
    </button>
  ),
);

Switch.displayName = "Switch";
