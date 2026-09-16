import type { Locale } from "next-intl";

import type { ProductVariantPricing } from "@/features/products/types/product-details.types";

type ProductPriceBlockProps = {
  locale: Locale;
  pricing: ProductVariantPricing;
  copy: {
    discount: (percentage: number) => string;
    promotion: string;
  };
};

function getDiscountPercentage(pricing: ProductVariantPricing): number | null {
  const compareAt = pricing.compareAt?.amount;
  const current = pricing.current.amount;

  if (!compareAt || compareAt <= 0 || current >= compareAt) return null;

  return Math.round(((compareAt - current) / compareAt) * 100);
}

export function ProductPriceBlock({
  copy,
  locale,
  pricing,
}: ProductPriceBlockProps) {
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: pricing.current.currency,
  });
  const discountPercentage = getDiscountPercentage(pricing);
  const hasDiscount = discountPercentage !== null;

  return (
    <div
      className={
        pricing.promotion
          ? "flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3"
          : "flex flex-wrap items-baseline gap-3"
      }
    >
      <div className="flex flex-wrap items-baseline gap-3">
        <strong
          className={
            hasDiscount
              ? "text-h3 font-bold text-destructive"
              : "text-h3 font-bold text-gray-900"
          }
        >
          <bdi>{currency.format(pricing.current.amount)}</bdi>
        </strong>
        {pricing.compareAt ? (
          <del className="type-body text-gray-400">
            <bdi>{currency.format(pricing.compareAt.amount)}</bdi>
          </del>
        ) : null}
        {hasDiscount ? (
          <span className="rounded-full bg-destructive px-3 py-1 type-badge text-gray-0">
            {copy.discount(discountPercentage)}
          </span>
        ) : null}
      </div>
      {pricing.promotion ? (
        <span className="type-ui-sm text-destructive">{copy.promotion}</span>
      ) : null}
    </div>
  );
}
