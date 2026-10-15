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
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <Rating
        size="detail"
        value={average}
        label={formatProductMessage(ratingLabelTemplate, {
          value: numbers.format(average),
        })}
      />
      <a
        href="#reviews"
        className="inline-flex min-h-11 items-center rounded-sm type-body text-gray-700 underline decoration-gray-300 underline-offset-4 hover:text-gold-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {formatProductMessage(ratingSummaryTemplate, {
          average: numbers.format(average),
          count: numbers.format(summary.count),
        })}
      </a>
    </div>
  );
}
