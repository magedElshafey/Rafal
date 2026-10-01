import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface PriceDisplayProps {
  price: ReactNode;
  originalPrice?: ReactNode;
  className?: string;
}

export function PriceDisplay({
  className,
  originalPrice,
  price,
}: PriceDisplayProps) {
  return (
    <span
      className={cn(
        "flex min-h-[var(--text-card-discount-price--line-height)] flex-wrap items-baseline gap-x-1.5 tabular-nums",
        className,
      )}
    >
      <span
        className={cn(
          "whitespace-nowrap",
          originalPrice
            ? "type-card-discount-price text-destructive"
            : "type-card-price text-foreground",
        )}
      >
        {price}
      </span>
      {originalPrice ? (
        <del className="whitespace-nowrap type-card-original-price text-gray-500">
          {originalPrice}
        </del>
      ) : null}
    </span>
  );
}
