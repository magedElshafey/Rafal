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
      className={cn("flex items-baseline gap-1.5 whitespace-nowrap", className)}
    >
      {originalPrice ? (
        <del className="type-card-original-price text-gray-400">
          {originalPrice}
        </del>
      ) : null}
      <span
        className={cn(
          originalPrice
            ? "type-card-discount-price text-destructive"
            : "type-card-price text-gray-1000",
        )}
      >
        {price}
      </span>
    </span>
  );
}
