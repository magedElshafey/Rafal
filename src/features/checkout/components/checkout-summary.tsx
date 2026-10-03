import type { Locale } from "next-intl";

import { AppImage } from "@/components/ui/app-image";
import { Skeleton } from "@/components/ui/skeleton";
import type { CartMoney } from "@/features/cart/types/cart.types";
import type { CheckoutQuote } from "@/features/checkout/types/checkout.types";
import { Link } from "@/i18n/navigation";

export type CheckoutSummaryItem = {
  id: string;
  imageSrc: string | null;
  lineTotal: CartMoney;
  name: string;
  personalizationText: string | null;
  productSlug: string;
  quantity: number;
  variantAttributes: readonly { name: string; value: string }[];
};

export type CheckoutSummaryCopy = {
  title: string;
  waiting: string;
  unavailable: string;
  subtotal: string;
  productDiscount: string;
  personalization: string;
  giftWrap: string;
  shipping: string;
  shippingPending: string;
  couponDiscount: string;
  vat: string;
  total: string;
  quantity: string;
  personalizedWith: string;
};

type CheckoutSummaryProps = {
  copy: CheckoutSummaryCopy;
  hasDestination: boolean;
  isLoading: boolean;
  items: readonly CheckoutSummaryItem[];
  locale: Locale;
  quote: CheckoutQuote | null;
};

function formatMoney(locale: Locale, amount: string, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(Number(amount));
}

function isNonZero(value: string) {
  return Number(value) !== 0;
}

function SummaryRow({
  discount = false,
  label,
  value,
}: {
  discount?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt>{label}</dt>
      <dd className={discount ? "text-destructive" : "text-gray-1000"}>
        <bdi>{value}</bdi>
      </dd>
    </div>
  );
}

export function CheckoutSummary({
  copy,
  hasDestination,
  isLoading,
  items,
  locale,
  quote,
}: CheckoutSummaryProps) {
  return (
    <aside
      aria-labelledby="checkout-summary-title"
      aria-busy={isLoading || undefined}
      className="rounded-lg bg-gray-50 p-5 sm:p-6 lg:sticky lg:top-4"
    >
      <h2 id="checkout-summary-title" className="text-h3 font-bold text-gray-1000">
        {copy.title}
      </h2>

      <ul className="mt-5 divide-y divide-gray-200">
        {items.map((item) => (
          <li
            key={item.id}
            className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 py-4 first:pt-0 sm:grid-cols-[4rem_minmax(0,1fr)_auto]"
          >
            <Link
              href={`/products/${item.productSlug}`}
              className="block self-start rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <AppImage
                src={item.imageSrc}
                alt={item.name}
                aspectRatio="1 / 1"
                sizes="64px"
                frameClassName="rounded-md"
              />
            </Link>
            <div className="min-w-0">
              <Link
                href={`/products/${item.productSlug}`}
                className="type-body-sm font-medium text-gray-1000 hover:text-gold-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.name}
              </Link>
              <p className="mt-1 type-caption text-gray-500">
                {copy.quantity}: <bdi>{item.quantity}</bdi>
              </p>
              {item.variantAttributes.length > 0 ? (
                <dl className="mt-1 flex flex-wrap gap-x-2 type-caption text-gray-500">
                  {item.variantAttributes.map((attribute) => (
                    <div key={attribute.name} className="flex gap-1">
                      <dt>{attribute.name}:</dt>
                      <dd>{attribute.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {item.personalizationText ? (
                <p className="mt-1 type-caption text-gold-700">
                  {copy.personalizedWith}: <bdi>{item.personalizationText}</bdi>
                </p>
              ) : null}
            </div>
            <strong className="col-start-2 type-body-sm text-gray-1000 sm:col-start-3 sm:row-start-1 sm:text-end">
              <bdi>
                {formatMoney(
                  locale,
                  item.lineTotal.amount,
                  item.lineTotal.currency,
                )}
              </bdi>
            </strong>
          </li>
        ))}
      </ul>

      {isLoading ? (
        <div className="mt-5 space-y-4 border-t border-gray-200 pt-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex justify-between gap-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
          <Skeleton className="h-px w-full rounded-none" />
          <div className="flex justify-between gap-6">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      ) : !quote ? (
        <p className="mt-5 border-t border-gray-200 pt-5 type-body-sm text-gray-500">
          {hasDestination ? copy.unavailable : copy.waiting}
        </p>
      ) : (
        <>
          <dl className="mt-5 space-y-4 border-t border-gray-200 pt-5 type-body text-gray-600">
            <SummaryRow
              label={copy.subtotal}
              value={formatMoney(locale, quote.totals.subtotal, quote.totals.currency)}
            />
            {isNonZero(quote.totals.productDiscountTotal) ? (
              <SummaryRow
                label={copy.productDiscount}
                value={`−${formatMoney(locale, quote.totals.productDiscountTotal, quote.totals.currency)}`}
                discount
              />
            ) : null}
            {isNonZero(quote.totals.personalizationTotal) ? (
              <SummaryRow
                label={copy.personalization}
                value={formatMoney(locale, quote.totals.personalizationTotal, quote.totals.currency)}
              />
            ) : null}
            {isNonZero(quote.totals.giftWrapFee) ? (
              <SummaryRow
                label={copy.giftWrap}
                value={formatMoney(locale, quote.totals.giftWrapFee, quote.totals.currency)}
              />
            ) : null}
            <SummaryRow
              label={copy.shipping}
              value={
                quote.totals.shippingFee === null
                  ? copy.shippingPending
                  : formatMoney(
                      locale,
                      quote.totals.shippingFee,
                      quote.totals.currency,
                    )
              }
            />
            {isNonZero(quote.totals.couponDiscount) ? (
              <SummaryRow
                label={copy.couponDiscount}
                value={`−${formatMoney(locale, quote.totals.couponDiscount, quote.totals.currency)}`}
                discount
              />
            ) : null}
            <SummaryRow
              label={copy.vat.replace("{rate}", quote.totals.vat.rate)}
              value={formatMoney(locale, quote.totals.vat.amount, quote.totals.currency)}
            />
          </dl>
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-gray-200 pt-5">
            <span className="type-body-lg font-medium text-gray-700">
              {copy.total}
            </span>
            <strong className="text-h3 text-gray-1000">
              <bdi>
                {formatMoney(locale, quote.totals.total, quote.totals.currency)}
              </bdi>
            </strong>
          </div>
        </>
      )}
    </aside>
  );
}
