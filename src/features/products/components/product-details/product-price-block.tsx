import type { Locale } from "next-intl";

import type { ProductVariantPricing } from "@/features/products/types/product-details.types";
import { PromotionCountdown } from "@/features/products/components/product-details/promotion-countdown";
import { formatProductMessage } from "@/features/products/utils/format-product-message";

type ProductPriceBlockProps = {
  locale: Locale;
  pricing: ProductVariantPricing;
  renderedAt: number;
  copy: {
    countdown: {
      days: string;
      expired: string;
      hours: string;
      label: string;
      minutes: string;
      seconds: string;
    };
    discountTemplate: string;
    promotion: string;
  };
};

export function ProductPriceBlock({
  copy,
  locale,
  pricing,
  renderedAt,
}: ProductPriceBlockProps) {
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: pricing.current.currency,
  });
  const hasDiscount = pricing.compareAt !== null;
  const discountPercentage = pricing.promotion?.percentage ?? null;

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
        {hasDiscount && pricing.compareAt ? (
          <del className="type-body text-gray-400">
            <bdi>{currency.format(pricing.compareAt.amount)}</bdi>
          </del>
        ) : null}
        {discountPercentage !== null ? (
          <span className="rounded-full bg-destructive px-3 py-1 type-badge text-gray-0">
            {formatProductMessage(copy.discountTemplate, {
              percentage: discountPercentage,
            })}
          </span>
        ) : null}
      </div>
      {pricing.promotion ? (
        <div className="flex flex-col items-start gap-1">
          <span className="type-ui-sm text-destructive">{copy.promotion}</span>
          {pricing.promotion.endsAt ? (
            <PromotionCountdown
              key={pricing.promotion.endsAt}
              copy={copy.countdown}
              endsAt={pricing.promotion.endsAt}
              initialNow={renderedAt}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
