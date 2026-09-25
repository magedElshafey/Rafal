import { RatingStarIcon } from "@/components/ui/icons";

import type { ProductCardRating } from "./product-card";

export function RatingMetadata({
  label,
  reviewsLabel,
  value,
}: ProductCardRating) {
  const normalizedValue = Number.isFinite(value)
    ? Math.max(0, Math.min(5, value))
    : 0;

  return (
    <span
      role="img"
      aria-label={`${label}. ${reviewsLabel}`}
      className="inline-flex min-w-0 items-center gap-1 type-body-sm"
    >
      <RatingStarIcon
        aria-hidden="true"
        className="size-3.5 shrink-0 text-gold-500"
      />
      <span
        aria-hidden="true"
        className="font-medium tabular-nums text-gray-1000"
      >
        {normalizedValue.toFixed(1)}
      </span>
      <span aria-hidden="true" className="text-gray-300">
        ·
      </span>
      <span aria-hidden="true" className="truncate text-gray-500" dir="auto">
        {reviewsLabel}
      </span>
    </span>
  );
}
