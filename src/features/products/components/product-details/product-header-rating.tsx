import type { Locale } from "next-intl";

import { Rating } from "@/features/products/components/product-card/rating";
import type { ProductRatingSummary } from "@/features/products/types/product-details.types";
import { formatProductMessage } from "@/features/products/utils/format-product-message";

export function ProductHeaderRating({
  summary,
  locale,
  ratingLabelTemplate,
  ratingSummaryTemplate,
}: {
  summary: ProductRatingSummary;
  locale: Locale;
  ratingLabelTemplate: string;
  ratingSummaryTemplate: string;
}) {
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const average = summary.count === 0 ? 0 : summary.average;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Rating
        value={average}
        label={formatProductMessage(ratingLabelTemplate, {
          value: numbers.format(average),
        })}
      />
      <a
        href="#reviews"
        className="rounded-sm type-body-sm text-gray-500 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {formatProductMessage(ratingSummaryTemplate, {
          average: numbers.format(average),
          count: numbers.format(summary.count),
        })}
      </a>
    </div>
  );
}
