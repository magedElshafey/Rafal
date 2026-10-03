"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { useState } from "react";

import { ErrorState } from "@/components/ui/error-state";
import type { Address } from "@/features/addresses/types/address.types";
import type { CartGiftRecipient } from "@/features/cart/types/cart.types";
import { checkoutQuoteQueryKey } from "@/features/checkout/api/checkout-query";
import {
  CheckoutDestinationSection,
  type CheckoutDestinationCopy,
} from "@/features/checkout/components/checkout-destination-section";
import {
  CheckoutShippingSection,
  type CheckoutShippingCopy,
} from "@/features/checkout/components/checkout-shipping-section";
import {
  CheckoutSummary,
  type CheckoutSummaryCopy,
  type CheckoutSummaryItem,
} from "@/features/checkout/components/checkout-summary";
import { useCheckoutQuote } from "@/features/checkout/hooks/use-checkout-quote";
import type {
  CheckoutDestination,
  CheckoutQuoteRequest,
} from "@/features/checkout/types/checkout.types";
import { Link } from "@/i18n/navigation";

export type CheckoutPageCopy = {
  title: string;
  emptyCart: {
    title: string;
    description: string;
    action: string;
  };
  destination: CheckoutDestinationCopy;
  shipping: CheckoutShippingCopy;
  summary: CheckoutSummaryCopy;
};

type CheckoutPageProps = {
  addresses: readonly Address[];
  addressesUnavailable: boolean;
  cartEmpty: boolean;
  copy: CheckoutPageCopy;
  giftRecipient: CartGiftRecipient | null;
  initialDestination: CheckoutDestination | null;
  isAuthenticated: boolean;
  locale: Locale;
  summaryItems: readonly CheckoutSummaryItem[];
};

export function CheckoutPage({
  addresses,
  addressesUnavailable,
  cartEmpty,
  copy,
  giftRecipient,
  initialDestination,
  isAuthenticated,
  locale,
  summaryItems,
}: CheckoutPageProps) {
  const queryClient = useQueryClient();
  const [destination, setDestination] =
    useState<CheckoutDestination | null>(initialDestination);
  const [shippingMethodId, setShippingMethodId] = useState<number | null>(null);
  const request: CheckoutQuoteRequest | null = destination
    ? {
        destination,
        ...(shippingMethodId === null ? {} : { shippingMethodId }),
      }
    : null;
  const quoteQuery = useCheckoutQuote(locale, request);

  const invalidateTarget = (nextRequest: CheckoutQuoteRequest) => {
    void queryClient.invalidateQueries({
      queryKey: checkoutQuoteQueryKey(locale, nextRequest),
      exact: true,
      refetchType: "none",
    });
  };

  const commitDestination = (nextDestination: CheckoutDestination) => {
    const nextRequest = { destination: nextDestination } as const;
    invalidateTarget(nextRequest);
    setShippingMethodId(null);
    setDestination(nextDestination);
  };

  const selectShipping = (nextShippingMethodId: number) => {
    if (!destination) return;
    invalidateTarget({
      destination,
      shippingMethodId: nextShippingMethodId,
    });
    setShippingMethodId(nextShippingMethodId);
  };

  if (cartEmpty) {
    return (
      <div>
        <h1 className="text-h1 font-bold text-gray-1000">{copy.title}</h1>
        <ErrorState
          className="mt-6 py-12"
          title={copy.emptyCart.title}
          description={copy.emptyCart.description}
          action={
            <Link
              href="/cart"
              className="inline-flex h-11 items-center justify-center rounded-md bg-gray-1000 px-5 type-body font-medium text-gray-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {copy.emptyCart.action}
            </Link>
          }
        />
      </div>
    );
  }

  const hasDestination = destination !== null;
  const quoteLoading =
    hasDestination && (quoteQuery.isPending || quoteQuery.isFetching);
  const quoteUsable =
    hasDestination &&
    quoteQuery.isSuccess &&
    !quoteQuery.isFetching;
  const quote = quoteUsable ? quoteQuery.data : null;
  const quoteError =
    hasDestination &&
    !quoteLoading &&
    quoteQuery.isError;

  return (
    <div>
      <h1 className="text-h1 font-bold text-gray-1000">{copy.title}</h1>
      <div
        dir="ltr"
        className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
      >
        <div dir={locale === "ar" ? "rtl" : "ltr"} className="space-y-6">
          <CheckoutDestinationSection
            addresses={addresses}
            addressesUnavailable={addressesUnavailable}
            committedDestination={destination}
            copy={copy.destination}
            giftRecipient={giftRecipient}
            isAuthenticated={isAuthenticated}
            locale={locale}
            onCommit={commitDestination}
          />
          <CheckoutShippingSection
            copy={copy.shipping}
            hasDestination={hasDestination}
            isError={quoteError}
            isLoading={quoteLoading}
            locale={locale}
            onRetry={() => void quoteQuery.refetch()}
            onSelect={selectShipping}
            quote={quote}
            selectedShippingMethodId={shippingMethodId}
          />
        </div>
        <div dir={locale === "ar" ? "rtl" : "ltr"}>
          <CheckoutSummary
            copy={copy.summary}
            hasDestination={hasDestination}
            isLoading={quoteLoading}
            items={summaryItems}
            locale={locale}
            quote={quote}
          />
        </div>
      </div>
    </div>
  );
}
