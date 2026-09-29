"use client";

import type { Locale } from "next-intl";
import { useState } from "react";

import type { Address } from "@/features/addresses/types/address.types";
import { quoteCurrentCheckoutAction } from "@/features/checkout/actions/checkout-actions";
import type {
  CheckoutDestination,
  CheckoutOneTimeAddressDraft,
} from "@/features/checkout/components/checkout-destination.types";
import {
  CheckoutDestinationSection,
  type CheckoutDestinationCopy,
} from "@/features/checkout/components/checkout-destination-section";
import { CheckoutLayout } from "@/features/checkout/components/checkout-layout";
import { CheckoutStepSection } from "@/features/checkout/components/checkout-step-section";
import {
  CheckoutSummary,
  type CheckoutSummaryCopy,
} from "@/features/checkout/components/checkout-summary";
import type {
  CheckoutQuote,
  CheckoutQuoteError,
  CheckoutQuoteRequest,
  CheckoutQuoteResult,
} from "@/features/checkout/types/checkout.types";
import { parseCheckoutBackendId } from "@/features/checkout/utils/checkout-backend-id";
import type { CartSnapshot } from "@/features/cart/types/cart.types";

export type CheckoutFlowCopy = {
  title: string;
  destination: CheckoutDestinationCopy;
  inactiveStep: string;
  shippingStep: string;
  paymentStep: string;
  summary: CheckoutSummaryCopy;
};

type CheckoutFlowProps = {
  addressListUnavailable: boolean;
  addresses: readonly Address[];
  cart: CartSnapshot;
  copy: CheckoutFlowCopy;
  initialDestination: CheckoutDestination;
  initialQuote: CheckoutQuote | null;
  initialQuoteError: CheckoutQuoteError | null;
  locale: Locale;
};

export function CheckoutFlow({
  addressListUnavailable,
  addresses,
  cart,
  copy,
  initialDestination,
  initialQuote,
  initialQuoteError,
  locale,
}: CheckoutFlowProps) {
  const [destination, setDestination] =
    useState<CheckoutDestination>(initialDestination);
  const [quote, setQuote] = useState<CheckoutQuote | null>(initialQuote);
  const [quoteError, setQuoteError] =
    useState<CheckoutQuoteError | null>(initialQuoteError);
  const [pending, setPending] = useState(false);
  const [showForm, setShowForm] = useState(
    initialDestination.kind === "none",
  );

  const requestQuote = async (
    nextDestination: CheckoutDestination & {
      request: CheckoutQuoteRequest;
    },
  ): Promise<CheckoutQuoteResult> => {
    setDestination(nextDestination);
    setQuoteError(null);
    setPending(true);

    try {
      const result = await quoteCurrentCheckoutAction(
        nextDestination.request,
        locale,
      );

      if (result.ok) {
        setQuote(result.quote);
      } else {
        setQuote(null);
        setQuoteError(result.error);
      }
      return result;
    } catch {
      const result: CheckoutQuoteResult = {
        ok: false,
        error: { code: "service-unavailable" },
      };
      setQuote(null);
      setQuoteError(result.error);
      return result;
    } finally {
      setPending(false);
    }
  };

  const selectAddress = (address: Address) => {
    const addressId = parseCheckoutBackendId(address.id);
    if (addressId === null) {
      setQuote(null);
      setQuoteError({ code: "invalid-input", fields: ["addressId"] });
      setShowForm(true);
      return;
    }

    setShowForm(false);
    void requestQuote({
      kind: "saved",
      addressId: address.id,
      request: { cityId: address.city.id, addressId },
    });
  };

  const submitOneTime = async (
    draft: CheckoutOneTimeAddressDraft,
  ): Promise<CheckoutQuoteResult> => {
    if (!draft.city) {
      return {
        ok: false,
        error: { code: "invalid-input", fields: ["cityId"] },
      };
    }

    const result = await requestQuote({
      kind: "one-time",
      draft,
      request: {
        cityId: draft.city.id,
        address: {
          recipientName: draft.recipientName,
          recipientPhone: draft.recipientPhone,
          district: draft.district,
          streetDetails: draft.streetDetails,
        },
      },
    });
    if (result.ok) setShowForm(false);
    return result;
  };

  const retry = () => {
    if ("request" in destination) void requestQuote(destination);
  };

  return (
    <CheckoutLayout
      title={copy.title}
      workflow={
        <div className="space-y-6">
          <CheckoutDestinationSection
            addressListUnavailable={addressListUnavailable}
            addresses={addresses}
            copy={copy.destination}
            destination={destination}
            locale={locale}
            pending={pending}
            quote={quote}
            quoteError={quoteError}
            showForm={showForm}
            onAddAddress={() => setShowForm(true)}
            onCancelForm={() => setShowForm(false)}
            onChangeAddress={() => setShowForm(true)}
            onRetry={retry}
            onSelectAddress={selectAddress}
            onSubmitOneTime={submitOneTime}
          />
          <CheckoutStepSection
            id="checkout-shipping"
            step="2"
            title={copy.shippingStep}
            className="opacity-60"
          >
            <p className="type-body-sm text-gray-500">{copy.inactiveStep}</p>
          </CheckoutStepSection>
          <CheckoutStepSection
            id="checkout-payment"
            step="3"
            title={copy.paymentStep}
            className="opacity-60"
          >
            <p className="type-body-sm text-gray-500">{copy.inactiveStep}</p>
          </CheckoutStepSection>
        </div>
      }
      summary={
        <CheckoutSummary
          cart={cart}
          copy={copy.summary}
          locale={locale}
          quote={quote}
        />
      }
    />
  );
}

export type { CheckoutFlowProps };