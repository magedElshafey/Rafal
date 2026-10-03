"use client";

import type { Locale } from "next-intl";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckoutStepSection } from "@/features/checkout/components/checkout-step-section";
import type {
  CheckoutQuote,
  CheckoutUnavailableLine,
} from "@/features/checkout/types/checkout.types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type CheckoutShippingCopy = {
  title: string;
  waiting: string;
  loading: string;
  retry: string;
  refreshing: string;
  free: string;
  error: {
    title: string;
    description: string;
  };
  coverage: {
    title: string;
    description: string;
  };
  unavailable: {
    title: string;
    description: string;
    line: string;
    backToCart: string;
  };
  noOptions: {
    title: string;
    description: string;
  };
};

type CheckoutShippingSectionProps = {
  copy: CheckoutShippingCopy;
  hasDestination: boolean;
  isError: boolean;
  isLoading: boolean;
  locale: Locale;
  onRetry: () => void;
  onSelect: (shippingMethodId: number) => void;
  quote: CheckoutQuote | null;
  selectedShippingMethodId: number | null;
};

function formatMoney(locale: Locale, amount: string, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(Number(amount));
}

function unavailableLineLabel(
  line: CheckoutUnavailableLine,
  locale: Locale,
  template: string,
) {
  const productName = locale === "ar" ? line.productName.ar : line.productName.en;
  return template
    .replace("{name}", productName)
    .replace("{requested}", new Intl.NumberFormat(locale).format(line.requested))
    .replace("{available}", new Intl.NumberFormat(locale).format(line.available))
    .replace(
      "{variantTotalRequested}",
      new Intl.NumberFormat(locale).format(line.variantTotalRequested),
    );
}

export function CheckoutShippingSection({
  copy,
  hasDestination,
  isError,
  isLoading,
  locale,
  onRetry,
  onSelect,
  quote,
  selectedShippingMethodId,
}: CheckoutShippingSectionProps) {
  let content;

  if (!hasDestination) {
    content = <p className="type-body text-gray-500">{copy.waiting}</p>;
  } else if (isLoading) {
    content = (
      <div
        aria-busy="true"
        aria-label={
          selectedShippingMethodId === null ? copy.loading : copy.refreshing
        }
        className="space-y-3"
      >
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  } else if (isError || !quote) {
    content = (
      <ErrorState
        role="alert"
        title={copy.error.title}
        description={copy.error.description}
        action={
          <Button onClick={onRetry}>{copy.retry}</Button>
        }
      />
    );
  } else if (!quote.location.inCoverage) {
    content = (
      <ErrorState
        role="alert"
        title={copy.coverage.title}
        description={copy.coverage.description}
      />
    );
  } else if (!quote.fulfillable) {
    content = (
      <div
        role="alert"
        className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center"
      >
        <h3 className="text-h4 font-medium text-gray-1000">
          {copy.unavailable.title}
        </h3>
        <p className="mt-2 type-body text-gray-600">
          {copy.unavailable.description}
        </p>
        {quote.unavailableLines.length > 0 ? (
          <ul className="mx-auto mt-3 max-w-xl space-y-1 text-start type-body-sm text-gray-600">
            {quote.unavailableLines.map((line) => (
              <li key={line.cartItemId}>
                {unavailableLineLabel(line, locale, copy.unavailable.line)}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4">
          <Link
            href="/cart"
            className="inline-flex h-11 items-center justify-center rounded-md bg-gray-1000 px-5 type-body font-medium text-gray-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {copy.unavailable.backToCart}
          </Link>
        </div>
      </div>
    );
  } else if (quote.shippingOptions.length === 0) {
    content = (
      <ErrorState
        role="status"
        title={copy.noOptions.title}
        description={copy.noOptions.description}
      />
    );
  } else {
    content = (
      <fieldset>
        <legend className="sr-only">{copy.title}</legend>
        <div className="grid gap-3">
          {quote.shippingOptions.map((option) => {
            const selected = selectedShippingMethodId === option.id;
            return (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-4 rounded-md border p-4 transition-colors motion-reduce:transition-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                  selected
                    ? "border-gold-500 bg-gold-50/40"
                    : "border-gray-200 hover:border-gray-300",
                )}
              >
                <span className="min-w-0">
                  <input
                    type="radio"
                    name="checkout-shipping-method"
                    className="sr-only"
                    checked={selected}
                    onChange={() => onSelect(option.id)}
                  />
                  <span className="block type-body font-medium text-gray-1000">
                    {option.name}
                  </span>
                  {option.etaLabel ? (
                    <span className="mt-1 block type-caption text-gray-500">
                      {option.etaLabel}
                    </span>
                  ) : null}
                </span>
                <strong className="shrink-0 type-body text-gray-1000">
                  <bdi>
                    {option.isFree
                      ? copy.free
                      : formatMoney(locale, option.fee, quote.totals.currency)}
                  </bdi>
                </strong>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <CheckoutStepSection id="checkout-shipping" step="2" title={copy.title}>
      {content}
    </CheckoutStepSection>
  );
}
