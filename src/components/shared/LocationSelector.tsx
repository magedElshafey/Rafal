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
        "inline-flex items-center gap-2 rounded-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <MapPinIcon size={16} className="shrink-0 text-gray-900" />
      <span className="flex items-center gap-1 rtl:flex-row-reverse">
        <span className="text-xs  text-gray-600">{deliveryLabel}</span>
        <span className="type-ui-sm leading-none font-medium text-foreground">
          {city}
        </span>
      </span>
      <ChevronDownIcon size={14} className="shrink-0" />
    </button>
  );
}

export { LocationSelector };
export type { LocationSelectorProps };
