"use client";

import { useState } from "react";

import { RatingStarIcon } from "@/components/ui/icons/rating-star-icon";
import type { ProductReviewSubmissionRating } from "@/features/reviews/types/product-review.types";
import { cn } from "@/lib/utils";

const ratingValues = [1, 2, 3, 4, 5] as const;

type ProductReviewRatingInputProps = {
  error?: string;
  legend: string;
  name: string;
  onChange: (rating: ProductReviewSubmissionRating) => void;
  ratingLabelTemplate: string;
  value: ProductReviewSubmissionRating | null;
};

export function ProductReviewRatingInput({
  error,
  legend,
  name,
  onChange,
  ratingLabelTemplate,
  value,
}: ProductReviewRatingInputProps) {
  const errorId = `${name}-error`;
  const [preview, setPreview] = useState<ProductReviewSubmissionRating | null>(
    null,
  );
  const visibleRating = preview ?? value ?? 0;

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="type-label font-medium text-gray-800">{legend}</legend>
      <div
        className="mt-3 flex w-fit items-center gap-1"
        dir="ltr"
        onPointerLeave={() => setPreview(null)}
      >
        {ratingValues.map((rating) => {
          const label = ratingLabelTemplate.replace("{rating}", String(rating));
          const active = rating <= visibleRating;
          return (
            <span key={rating}>
              <input
                id={`${name}-${rating}`}
                className="peer sr-only"
                type="radio"
                name={name}
                value={rating}
                required
                checked={value === rating}
                aria-label={label}
                onChange={() => onChange(rating)}
              />
              <label
                htmlFor={`${name}-${rating}`}
                title={label}
                data-active={active}
                data-selected={value === rating}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse" || event.pointerType === "pen") {
                    setPreview(rating);
                  }
                }}
                className={cn(
                  "flex size-11 cursor-pointer items-center justify-center rounded-full text-gray-400",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-600",
                  active && "text-gold-500",
                  value === rating && "scale-110",
                )}
              >
                <RatingStarIcon
                  aria-hidden="true"
                  filled={active}
                  className="size-8"
                />
              </label>
            </span>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 type-caption text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
