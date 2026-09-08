"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { forwardRef } from "react";

import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export const Checkbox = forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer flex size-5 shrink-0 items-center justify-center rounded-sm border-[length:var(--border-width-emphasis)] border-gray-1000 bg-gray-0 text-gray-0 outline-none transition-colors",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-300 disabled:opacity-60 data-[state=checked]:bg-gray-1000",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator>
      <CheckIcon aria-hidden="true" className="size-3.5" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));

Checkbox.displayName = CheckboxPrimitive.Root.displayName;
