import Image from "next/image";
import type { Locale } from "next-intl";

import { CheckoutOrderSummary } from "@/features/checkout/components/checkout-order-summary";
import type { CheckoutQuote } from "@/features/checkout/types/checkout.types";
import type {
  CartMoney,
  CartSnapshot,
} from "@/features/cart/types/cart.types";

export type CheckoutSummaryCopy = {
  title: string;
  quantity: string;
  personalization: string;
  subtotal: string;
  productDiscount: string;
  personalizationTotal: string;
  giftWrap: string;
  shipping: string;
  couponDiscount: string;
  vatIncluded: string;
  total: string;
};

type CheckoutSummaryProps = {
  cart: CartSnapshot;
  copy: CheckoutSummaryCopy;
  locale: Locale;
  quote: CheckoutQuote | null;
};

function formatAmount(
  locale: Locale,
  amount: string,
  currency: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(Number(amount));
}

function formatMoney(locale: Locale, value: CartMoney): string {
  return formatAmount(locale, value.amount, value.currency);
}

function isNonZero(value: string): boolean {
  return Number(value) !== 0;
}

export function CheckoutSummary({
  cart,
  copy,
  locale,
  quote,
}: CheckoutSummaryProps) {
  const totals = quote?.totals;
  const currency = totals?.currency ?? cart.summary.total.currency;
  const amount = (quoteAmount: string | undefined, cartMoney: CartMoney) =>
    quoteAmount === undefined
      ? formatMoney(locale, cartMoney)
      : formatAmount(locale, quoteAmount, currency);
  const discount = (value: string) =>
    "\u2212" + formatAmount(locale, value, currency);
  const shippingValue = totals
    ? totals.shippingFee === null
      ? null
      : formatAmount(locale, totals.shippingFee, currency)
    : cart.summary.shippingFee
      ? formatMoney(locale, cart.summary.shippingFee)
      : null;
  const lines = [
    {
      id: "subtotal",
      label: copy.subtotal,
      value: amount(totals?.subtotal, cart.summary.subtotal),
    },
    ...(isNonZero(
      totals?.productDiscountTotal ??
        cart.summary.productDiscountTotal.amount,
    )
      ? [
          {
            id: "product-discount",
            label: copy.productDiscount,
            value: totals
              ? discount(totals.productDiscountTotal)
              : "\u2212" +
                formatMoney(locale, cart.summary.productDiscountTotal),
            tone: "discount" as const,
          },
        ]
      : []),
    ...(isNonZero(
      totals?.personalizationTotal ??
        cart.summary.personalizationTotal.amount,
    )
      ? [
          {
            id: "personalization",
            label: copy.personalizationTotal,
            value: amount(
              totals?.personalizationTotal,
              cart.summary.personalizationTotal,
            ),
          },
        ]
      : []),
    ...(isNonZero(totals?.giftWrapFee ?? cart.summary.giftWrapFee.amount)
      ? [
          {
            id: "gift-wrap",
            label: copy.giftWrap,
            value: amount(totals?.giftWrapFee, cart.summary.giftWrapFee),
          },
        ]
      : []),
    ...(shippingValue
      ? [
          {
            id: "shipping",
            label: copy.shipping,
            value: shippingValue,
          },
        ]
      : []),
    ...(isNonZero(totals?.couponDiscount ?? cart.summary.couponDiscount.amount)
      ? [
          {
            id: "coupon",
            label: copy.couponDiscount,
            value: totals
              ? discount(totals.couponDiscount)
              : "\u2212" + formatMoney(locale, cart.summary.couponDiscount),
            tone: "discount" as const,
          },
        ]
      : []),
    {
      id: "vat",
      label: copy.vatIncluded,
      value: amount(
        totals?.vat.includedAmount,
        cart.summary.vat.includedAmount,
      ),
    },
  ];

  return (
    <CheckoutOrderSummary
      id="checkout-summary"
      title={copy.title}
      items={cart.lines.map((line) => {
        const attributes = Object.values(line.variant.attributes);
        return {
          id: line.id,
          image: line.product.image ? (
            <Image
              src={line.product.image.src}
              alt={line.product.name}
              width={80}
              height={80}
              sizes="64px"
              className="size-full object-cover"
            />
          ) : undefined,
          name: line.product.name,
          variant:
            attributes.length > 0
              ? attributes.map(String).join(" \u00b7 ")
              : undefined,
          personalization: line.personalization?.text
            ? copy.personalization + ": " + line.personalization.text
            : undefined,
          quantity:
            copy.quantity +
            ": " +
            new Intl.NumberFormat(locale).format(line.quantity),
          price: <bdi>{formatMoney(locale, line.lineTotal)}</bdi>,
        };
      })}
      lines={lines.map((line) => ({
        ...line,
        value: <bdi>{line.value}</bdi>,
      }))}
      totalLabel={copy.total}
      totalValue={<bdi>{amount(totals?.total, cart.summary.total)}</bdi>}
      className="lg:sticky lg:top-4"
    />
  );
}

export type { CheckoutSummaryProps };