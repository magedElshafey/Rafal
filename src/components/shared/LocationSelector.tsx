import type { ButtonHTMLAttributes } from "react";

import { ChevronDownIcon, MapPinIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type LocationSelectorProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children" | "type"
> & {
  city: string;
  deliveryLabel: string;
  accessibilityLabel: string;
};

function LocationSelector({
  accessibilityLabel,
  city,
  className,
  deliveryLabel,
  ...props
}: LocationSelectorProps) {
  return (
    <button
      type="button"
      aria-label={accessibilityLabel}
      className={cn(
        "inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-md px-3 py-2 text-start transition-colors duration-[var(--motion-duration-fast)] hover:bg-gray-100 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <MapPinIcon size={16} className="shrink-0 text-gray-900" />
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-1">
        <span className="shrink-0 type-body-sm text-muted-foreground">{deliveryLabel}</span>
        <bdi className="min-w-0 break-words type-body font-bold text-foreground">
          {city}
        </bdi>
      </span>
      <ChevronDownIcon size={14} className="shrink-0" />
    </button>
  );
}

export { LocationSelector };
export type { LocationSelectorProps };
