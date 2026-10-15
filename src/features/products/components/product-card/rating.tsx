import { RatingStarIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export interface RatingProps {
  value: number;
  label: string;
  className?: string;
  size?: "card" | "detail";
}

export function Rating({ className, label, value, size = "card" }: RatingProps) {
  const normalizedValue = Number.isFinite(value)
    ? Math.max(0, Math.min(5, value))
    : 0;

  return (
    <span
      role="img"
      aria-label={label}
      data-rating-value={normalizedValue}
      className={cn(
        "inline-flex w-[var(--rating-width)] justify-between",
        size === "detail" && "[--rating-width:6rem] [--rating-star-size:1rem]",
        className,
      )}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, normalizedValue - index));

        return (
          <span
            key={index}
            aria-hidden="true"
            className={cn("relative size-[var(--rating-star-size)] shrink-0", size === "detail" ? "text-gray-400" : "text-gray-100")}
          >
            <RatingStarIcon className="absolute inset-0 size-full" />
            {fill > 0 ? (
              <span
                className="absolute inset-y-0 start-0 overflow-hidden text-gold-500"
                style={{ width: `${fill * 100}%` }}
              >
                <RatingStarIcon className="size-[var(--rating-star-size)] max-w-none" />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
