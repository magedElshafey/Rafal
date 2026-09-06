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
        "flex min-h-5 items-baseline gap-1.5 whitespace-nowrap",
        className,
      )}
    >
      {originalPrice ? (
        <del className="type-body-sm text-gray-400">{originalPrice}</del>
      ) : null}
      <span
        className={cn(
          "type-card-price text-gray-1000",
          originalPrice && "type-body-lg font-bold text-destructive",
        )}
      >
        {price}
      </span>
    </span>
  );
}
