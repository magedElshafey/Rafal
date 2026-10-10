"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import type { Address } from "@/features/addresses/types/address.types";
import type { CartSnapshot } from "@/features/cart/types/cart.types";
import {
  currentCartQueryKeyRoot,
  removeCurrentCartQueries,
} from "@/features/cart/api/cart-query";
import { checkoutQuoteQueryKey } from "@/features/checkout/api/checkout-query";
import { useBrowsingCity } from "@/features/location/components/browsing-city-provider";
import {
  CheckoutBuyerSection,
  type CheckoutBuyerCopy,
} from "@/features/checkout/components/checkout-buyer-section";
import {
  CheckoutDestinationSection,
  type CheckoutDestinationCopy,
} from "@/features/checkout/components/checkout-destination-section";
import {
  CheckoutGiftWrap,
  type CheckoutGiftWrapCopy,
} from "@/features/checkout/components/checkout-gift-wrap";
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
import { useCheckoutPlace } from "@/features/checkout/hooks/use-checkout-place";
import type {
  CheckoutBuyer,
  CheckoutDestination,
  CheckoutGiftWrapConfig,
  CheckoutPlaceRequest,
  CheckoutQuoteRequest,
  CheckoutUnavailableLine,
} from "@/features/checkout/types/checkout.types";
import {
  storeCheckoutConfirmationHandoff,
  storeCheckoutVerificationHandoff,
} from "@/features/checkout/utils/checkout-handoff";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/api-error";

export type CheckoutPageCopy = {
  title: string;
  emptyCart: {
    title: string;
    description: string;
    action: string;
  };
  destination: CheckoutDestinationCopy;
  buyer: CheckoutBuyerCopy;
  giftWrap: CheckoutGiftWrapCopy;
  shipping: CheckoutShippingCopy;
  summary: CheckoutSummaryCopy;
  place: {
    submit: string;
    submitting: string;
    error: string;
    checkoutChanged: string;
    unavailableTitle: string;
    unavailableDescription: string;
    backToCart: string;
  };
};

type CheckoutPageProps = {
  addresses: readonly Address[];
  addressesUnavailable: boolean;
  cartEmpty: boolean;
  copy: CheckoutPageCopy;
  giftWrapConfig: CheckoutGiftWrapConfig | null;
  initialGift: CartSnapshot["gift"];
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
  giftWrapConfig,
  initialGift,
  initialDestination,
  isAuthenticated,
  locale,
  summaryItems,
}: CheckoutPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isChanging: cityTransitionLocked } = useBrowsingCity();
  const placeMutation = useCheckoutPlace(locale);
  const placeInFlightRef = useRef(false);
  const recipientGiftPendingRef = useRef(false);
  const giftAddOnPendingRef = useRef(false);
  const [destination, setDestination] =
    useState<CheckoutDestination | null>(initialDestination);
  const [gift, setGift] = useState(initialGift);
  const [recipientGiftPending, setRecipientGiftPending] = useState(false);
  const [giftAddOnPending, setGiftAddOnPending] = useState(false);
  const [giftMessageDirty, setGiftMessageDirty] = useState(false);
  const [guestBuyer, setGuestBuyer] = useState<
    Extract<CheckoutBuyer, { kind: "guest" }> | null
  >(null);
  const [placeUnavailableLines, setPlaceUnavailableLines] = useState<
    readonly CheckoutUnavailableLine[]
  >([]);
  const [placeCompleted, setPlaceCompleted] = useState(false);
  const [shippingMethodId, setShippingMethodId] = useState<number | null>(null);
  const request: CheckoutQuoteRequest | null = destination
    ? {
        destination,
        ...(shippingMethodId === null ? {} : { shippingMethodId }),
      }
    : null;
  const quoteQuery = useCheckoutQuote(locale, request);

  const setRecipientGiftMutationPending = (pending: boolean) => {
    recipientGiftPendingRef.current = pending;
    setRecipientGiftPending(pending);
  };

  const setGiftAddOnMutationPending = (pending: boolean) => {
    giftAddOnPendingRef.current = pending;
    setGiftAddOnPending(pending);
  };

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
    setPlaceUnavailableLines([]);
    placeMutation.reset();
  };

  const selectShipping = (nextShippingMethodId: number) => {
    if (!destination) return;
    invalidateTarget({
      destination,
      shippingMethodId: nextShippingMethodId,
    });
    setShippingMethodId(nextShippingMethodId);
    setPlaceUnavailableLines([]);
    placeMutation.reset();
  };

  const persistGiftDestination = (nextGift: CartSnapshot["gift"]) => {
    const recipient = nextGift.recipient;
    if (!nextGift.isGift || !recipient) return;

    setGift(nextGift);
    commitDestination({
      kind: "gift-recipient",
      recipient: {
        recipientName: recipient.name,
        recipientPhone: recipient.phone,
        cityId: recipient.city.id,
        district: recipient.district,
        streetDetails: recipient.streetDetails,
      },
    });
  };

  const persistGiftAddOn = async (
    nextGift: CartSnapshot["gift"],
    refreshQuote: boolean,
  ) => {
    setGift(nextGift);
    setPlaceUnavailableLines([]);
    placeMutation.reset();
    if (!refreshQuote || !destination) return;

    const refreshed = await quoteQuery.refetch();
    if (
      refreshed.isSuccess &&
      shippingMethodId !== null &&
      !refreshed.data.shippingOptions.some(
        (option) => option.id === shippingMethodId,
      )
    ) {
      invalidateTarget({ destination });
      setShippingMethodId(null);
    }
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
  const selectedShippingOption =
    shippingMethodId === null
      ? null
      : quote?.shippingOptions.find(
          (option) => option.id === shippingMethodId,
        ) ?? null;
  const buyer: CheckoutBuyer | null = isAuthenticated
    ? { kind: "authenticated" }
    : guestBuyer;
  const placeRequest: CheckoutPlaceRequest | null =
    destination && shippingMethodId !== null && buyer
      ? { destination, shippingMethodId, buyer }
      : null;
  const placeReady = Boolean(
    !cityTransitionLocked &&
      placeRequest &&
      quote &&
      quote.location.inCoverage &&
      quote.fulfillable &&
      selectedShippingOption &&
      !recipientGiftPending &&
      !giftAddOnPending &&
      (!gift.isGift || !giftMessageDirty) &&
      placeUnavailableLines.length === 0 &&
      !placeCompleted &&
      !placeMutation.isPending,
  );

  const placeOrder = async () => {
    if (
      !placeReady ||
      !placeRequest ||
      cityTransitionLocked ||
      placeInFlightRef.current ||
      recipientGiftPendingRef.current ||
      giftAddOnPendingRef.current
    ) return;
    placeInFlightRef.current = true;
    placeMutation.reset();
    try {
      const result = await placeMutation.mutateAsync(placeRequest);
      try {
        await queryClient.cancelQueries({ queryKey: currentCartQueryKeyRoot });
      } catch {
        // A confirmed Place result must never become a retryable Place failure.
      }
      removeCurrentCartQueries(queryClient);
      setPlaceCompleted(true);
      const encodedOrderNumber = encodeURIComponent(result.orderNumber);
      if (result.kind === "verification-required") {
        storeCheckoutVerificationHandoff(
          result,
          placeRequest.buyer.kind === "guest" ? placeRequest.buyer.email : "",
        );
        router.push(`/orders/${encodedOrderNumber}/verify`);
      } else {
        storeCheckoutConfirmationHandoff(result);
        router.push(`/orders/${encodedOrderNumber}/confirmation`);
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === "unavailable-lines") {
        const lines = Array.isArray(error.details)
          ? error.details.filter(
              (line): line is CheckoutUnavailableLine =>
                typeof line === "object" && line !== null,
            )
          : [];
        setPlaceUnavailableLines(lines);
      } else if (
        error instanceof ApiError &&
        error.code === "checkout-changed"
      ) {
        void quoteQuery.refetch();
      }
    } finally {
      placeInFlightRef.current = false;
    }
  };

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
            gift={gift}
            isAuthenticated={isAuthenticated}
            locale={locale}
            onCommit={commitDestination}
            giftMutationDisabled={giftAddOnPending || cityTransitionLocked}
            onGiftPendingChange={setRecipientGiftMutationPending}
            onGiftPersisted={persistGiftDestination}
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
          {!isAuthenticated ? (
            <CheckoutBuyerSection
              copy={copy.buyer}
              committedBuyer={guestBuyer}
              onCommit={(nextBuyer) => {
                setGuestBuyer(nextBuyer);
                setPlaceUnavailableLines([]);
                placeMutation.reset();
              }}
            />
          ) : null}
          <CheckoutGiftWrap
            config={giftWrapConfig}
            copy={copy.giftWrap}
            disabled={recipientGiftPending || cityTransitionLocked}
            gift={gift}
            locale={locale}
            onMessageDirtyChange={setGiftMessageDirty}
            onPendingChange={setGiftAddOnMutationPending}
            onPersisted={persistGiftAddOn}
          />
        </div>
        <div dir={locale === "ar" ? "rtl" : "ltr"}>
          <CheckoutSummary
            copy={copy.summary}
            hasDestination={hasDestination}
            isLoading={quoteLoading}
            items={summaryItems}
            locale={locale}
            placeAction={
              <div>
                {placeUnavailableLines.length > 0 ? (
                  <div
                    role="alert"
                    className="mb-4 rounded-md border border-destructive/20 bg-destructive/5 p-4"
                  >
                    <p className="type-body font-medium text-gray-1000">
                      {copy.place.unavailableTitle}
                    </p>
                    <p className="mt-1 type-body-sm text-gray-600">
                      {copy.place.unavailableDescription}
                    </p>
                    <ul className="mt-2 list-disc space-y-1 ps-5 type-body-sm text-destructive">
                      {placeUnavailableLines.map((line) => (
                        <li key={line.cartItemId}>
                          {line.productName[locale]}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/cart"
                      className="mt-3 inline-flex min-h-11 items-center font-medium text-destructive underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {copy.place.backToCart}
                    </Link>
                  </div>
                ) : placeMutation.isError ? (
                  <p role="alert" className="mb-3 type-body-sm text-destructive">
                    {placeMutation.error instanceof ApiError &&
                    placeMutation.error.code === "checkout-changed"
                      ? copy.place.checkoutChanged
                      : copy.place.error}
                  </p>
                ) : null}
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!placeReady}
                  loading={placeMutation.isPending}
                  loadingLabel={copy.place.submitting}
                  onClick={() => void placeOrder()}
                >
                  {copy.place.submit}
                </Button>
              </div>
            }
            quote={quote}
          />
        </div>
      </div>
    </div>
  );
}
