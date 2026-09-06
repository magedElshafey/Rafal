import { StarIcon } from "@phosphor-icons/react/dist/ssr/Star";

import { cn } from "@/lib/utils";

export interface RatingProps {
  value: number;
  label: string;
  className?: string;
}

export function Rating({ className, label, value }: RatingProps) {
  const normalizedValue = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-flex w-[var(--rating-width)] justify-between", className)}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon
          key={index}
          aria-hidden="true"
          size={10}
          weight="fill"
          className={index < normalizedValue ? "text-gold-500" : "text-gray-200"}
        />
      ))}
    </span>
  );
}
