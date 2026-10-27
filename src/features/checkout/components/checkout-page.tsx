"use client";

import { beginRecommendationTransition } from "@/features/cart/api/cart-recommendation-lifecycle";

import { useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { Suspense, useRef, useState } from "react";

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
  storeCheckoutPaymentHandoff,
} from "@/features/checkout/utils/checkout-handoff";
import { parseCheckoutHostedPaymentResult } from "@/features/checkout/api/parse-checkout-hosted-payment";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/api-error";
import { CheckoutPaymentLoading, CheckoutPaymentRead, type CheckoutPaymentCopy } from "@/features/checkout/components/checkout-payment-section";
import { canSelectCheckoutPayment, canSubmitCheckoutPayment, legacyCheckoutPaymentMethod, type CheckoutPaymentCode } from "@/features/checkout/utils/checkout-payment-presentation";
import type { CheckoutPaymentDiscovery } from "@/features/checkout/types/checkout.types";
import { isDefinitivePrePlaceRejection } from "@/features/checkout/utils/checkout-place-attempt";

export type CheckoutPageCopy = {
  title: string;
  payment: CheckoutPaymentCopy;
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
    outcomeUnknown: string;
    orderCreated: string;
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
  paymentDiscovery: Promise<CheckoutPaymentDiscovery>;
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
  paymentDiscovery,
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
  // Mount-local duplicate protection only; never a substitute for backend idempotency.
  const placeAttemptLockedRef = useRef(false);
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
  const [placeOutcome, setPlaceOutcome] = useState<
    { kind: "unknown" } | { kind: "created"; orderNumber: string } | null
  >(null);
  // Only additional methods depend on the discovery snapshot that offered them.
  const [selectedPaymentCode, setSelectedPaymentCode] = useState<CheckoutPaymentCode>(legacyCheckoutPaymentMethod);
  const [selectedPaymentDiscovery, setSelectedPaymentDiscovery] = useState<Promise<CheckoutPaymentDiscovery> | null>(null);
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

  const commitDestination = (nextDestination: CheckoutDestination | null) => {
    // Editing a delivery draft must not leave the old address eligible for Place.
    if (nextDestination) invalidateTarget({ destination: nextDestination });
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
      ? { destination, shippingMethodId, buyer, ...(selectedPaymentCode !== "bank_transfer" ? { paymentMethod: selectedPaymentCode } : {}) }
      : null;
  const paymentReady = canSubmitCheckoutPayment(selectedPaymentCode, selectedPaymentDiscovery === paymentDiscovery);
  // Mutation error state can arrive before placeOrder records the outcome.
  const uncertainPlaceError =
    placeMutation.isError &&
    !isDefinitivePrePlaceRejection(placeMutation.error);
  const placeReady = Boolean(
    !cityTransitionLocked &&
      paymentReady &&
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
      placeOutcome === null &&
      !uncertainPlaceError &&
      !placeMutation.isPending,
  );

  const placeOrder = async () => {
    if (
      !placeReady ||
      !placeRequest ||
      cityTransitionLocked ||
      placeInFlightRef.current ||
      placeAttemptLockedRef.current ||
      recipientGiftPendingRef.current ||
      giftAddOnPendingRef.current
    ) return;
    placeInFlightRef.current = true;
    const recommendationTransition = beginRecommendationTransition(queryClient);
    placeMutation.reset();
    let requestStarted = false;
    let createdOrderNumber: string | null = null;
    try {
      await recommendationTransition.ready;
      requestStarted = true;
      placeAttemptLockedRef.current = true;
      const result = await placeMutation.mutateAsync(placeRequest);
      // Keep the browser protocol narrow until pending-order cleanup is agreed.
      if (result.kind !== "verification-required" && result.kind !== "confirmed" && result.kind !== "hosted-payment-required") {
        throw new Error("Unsupported Checkout result.");
      }
      createdOrderNumber = result.orderNumber;
      setPlaceOutcome({ kind: "created", orderNumber: result.orderNumber });
      if (result.kind === "hosted-payment-required") {
        if (!isAuthenticated) throw new Error("Unsupported Checkout result.");
        const validated = parseCheckoutHostedPaymentResult(result, Date.now());
        if (!storeCheckoutPaymentHandoff(validated)) throw new Error("Checkout handoff unavailable.");
        // A pending hosted order does not establish that Laravel consumed the cart.
        setPlaceCompleted(true);
        window.location.assign(validated.handoff.paymentUrl);
        return;
      }
      try {
        await queryClient.cancelQueries({ queryKey: currentCartQueryKeyRoot });
      } catch {
        // A confirmed Place result must never become a retryable Place failure.
      }
      removeCurrentCartQueries(queryClient);
      setPlaceCompleted(true);
      const encodedOrderNumber = encodeURIComponent(result.orderNumber);
      if (result.kind === "verification-required") {
        const stored = storeCheckoutVerificationHandoff(
          result,
          placeRequest.buyer.kind === "guest" ? placeRequest.buyer.phone : "",
        );
        if (!stored) throw new Error("Checkout handoff unavailable.");
        router.push(`/orders/${encodedOrderNumber}/verify`);
      } else {
        const stored = storeCheckoutConfirmationHandoff(result);
        if (!stored) throw new Error("Checkout handoff unavailable.");
        router.push(`/orders/${encodedOrderNumber}/confirmation`);
      }
    } catch (error) {
      if (requestStarted && createdOrderNumber === null) {
        if (isDefinitivePrePlaceRejection(error)) {
          placeAttemptLockedRef.current = false;
        } else {
          // Includes malformed successes and backend HTTP errors: neither proves
          // that no order exists. Edits/mutation.reset must not unlock this attempt.
          setPlaceOutcome({ kind: "unknown" });
        }
      }
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
      recommendationTransition.finish();
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
          <Suspense fallback={<CheckoutPaymentLoading copy={copy.payment} step={isAuthenticated ? "3" : "4"} />}>
            <CheckoutPaymentRead
              discovery={paymentDiscovery}
              copy={copy.payment}
              step={isAuthenticated ? "3" : "4"}
              selectedCode={paymentReady ? selectedPaymentCode : null}
              onSelect={(code) => {
                if (canSelectCheckoutPayment(code, true)) {
                  setSelectedPaymentCode(code);
                  setSelectedPaymentDiscovery(paymentDiscovery);
                }
              }}
            />
          </Suspense>
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
                {placeOutcome !== null ? (
                  <p role="status" className="mb-3 type-body-sm text-gray-700">
                    {placeOutcome.kind === "unknown" ? copy.place.outcomeUnknown : (
                      <>{copy.place.orderCreated} <bdi>{placeOutcome.orderNumber}</bdi></>
                    )}
                  </p>
                ) : placeUnavailableLines.length > 0 ? (
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
                    {uncertainPlaceError ? copy.place.outcomeUnknown : copy.place.error}
                  </p>
                ) : null}
                <p id="checkout-submitted-payment" className="mb-3 type-body-sm text-gray-600">
                  {copy.payment.submissionNotice.replace("{method}", copy.payment.methods[selectedPaymentCode]?.label ?? copy.payment.selectionUnavailable)}
                </p>
                {!paymentReady ? (
                  <div className="mb-3">
                    <p role="alert" className="type-body-sm text-destructive">{copy.payment.selectionUnavailable}</p>
                  </div>
                ) : null}
                <Button
                  size="lg"
                  aria-describedby="checkout-submitted-payment"
                  className="w-full"
                  disabled={!placeReady}
                  loading={placeMutation.isPending}
                  loadingLabel={copy.place.submitting}
                  onClick={() => void placeOrder()}
                >
                  {copy.place.submit}
                </Button>
                {!paymentReady ? <Button variant="ghost" onClick={() => setSelectedPaymentCode("card")}>{copy.payment.methods.card.label}</Button> : null}
              </div>
            }
            quote={quote}
          />
        </div>
      </div>
    </div>
  );
}
