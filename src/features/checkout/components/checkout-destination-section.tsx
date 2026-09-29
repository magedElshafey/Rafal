"use client";

import type { Locale } from "next-intl";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Address } from "@/features/addresses/types/address.types";
import type {
  CheckoutDestination,
  CheckoutOneTimeAddressDraft,
} from "@/features/checkout/components/checkout-destination.types";
import {
  CheckoutOneTimeAddressForm,
  type CheckoutOneTimeAddressFormCopy,
} from "@/features/checkout/components/checkout-one-time-address-form";
import { CheckoutOptionRow } from "@/features/checkout/components/checkout-option-row";
import { CheckoutStepSection } from "@/features/checkout/components/checkout-step-section";
import type {
  CheckoutQuote,
  CheckoutQuoteError,
  CheckoutQuoteResult,
} from "@/features/checkout/types/checkout.types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type CheckoutDestinationCopy = {
  stepTitle: string;
  selectedLabel: string;
  defaultLabel: string;
  giftLabel: string;
  oneTimeLabel: string;
  addNew: string;
  editAddress: string;
  savedUnavailable: string;
  giftMissingTitle: string;
  giftMissingDescription: string;
  editGift: string;
  feedback: {
    pending: string;
    coverageTitle: string;
    coverageDescription: string;
    changeAddress: string;
    unfulfillableTitle: string;
    unfulfillableDescription: string;
    returnToCart: string;
    quoteError: string;
    sessionError: string;
    validationError: string;
    retry: string;
  };
  form: CheckoutOneTimeAddressFormCopy;
};

type CheckoutDestinationSectionProps = {
  addressListUnavailable: boolean;
  addresses: readonly Address[];
  copy: CheckoutDestinationCopy;
  destination: CheckoutDestination;
  locale: Locale;
  pending: boolean;
  quote: CheckoutQuote | null;
  quoteError: CheckoutQuoteError | null;
  showForm: boolean;
  onAddAddress: () => void;
  onCancelForm: () => void;
  onChangeAddress: () => void;
  onRetry: () => void;
  onSelectAddress: (address: Address) => void;
  onSubmitOneTime: (
    draft: CheckoutOneTimeAddressDraft,
  ) => Promise<CheckoutQuoteResult>;
};

function AddressDescription({ address }: { address: Address }) {
  return (
    <>
      <span className="block">
        {address.city.name}, {address.district}, {address.streetDetails}
      </span>
      <bdi dir="ltr" className="mt-1 block">
        {address.recipientPhone}
      </bdi>
    </>
  );
}

function InlineAlert({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/20 bg-destructive/5 p-4"
    >
      <p className="type-body font-medium text-gray-1000">{title}</p>
      {description ? (
        <p className="mt-1 type-body-sm text-gray-600">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function QuoteFeedback({
  copy,
  destination,
  onChangeAddress,
  onRetry,
  pending,
  quote,
  quoteError,
}: Pick<
  CheckoutDestinationSectionProps,
  | "copy"
  | "destination"
  | "onChangeAddress"
  | "onRetry"
  | "pending"
  | "quote"
  | "quoteError"
>) {
  if (pending) {
    return (
      <p role="status" aria-live="polite" className="type-body-sm text-gray-600">
        {copy.feedback.pending}
      </p>
    );
  }

  if (quoteError) {
    const message =
      quoteError.code === "unauthorized" ||
      quoteError.code === "cart-session-unavailable"
        ? copy.feedback.sessionError
        : quoteError.code === "invalid-input"
          ? copy.feedback.validationError
          : copy.feedback.quoteError;

    return (
      <InlineAlert
        title={message}

        action={
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {copy.feedback.retry}
          </Button>
        }
      />
    );
  }

  if (quote && !quote.location.inCoverage) {
    const gift = destination.kind === "gift";
    return (
      <InlineAlert
        title={copy.feedback.coverageTitle}
        description={copy.feedback.coverageDescription}
        action={
          gift ? (
            <Link
              href="/cart"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {copy.editGift}
            </Link>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onChangeAddress}
            >
              {copy.feedback.changeAddress}
            </Button>
          )
        }
      />
    );
  }

  if (quote && !quote.fulfillable) {
    return (
      <InlineAlert
        title={copy.feedback.unfulfillableTitle}
        description={copy.feedback.unfulfillableDescription}
        action={
          <Link
            href="/cart"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {copy.feedback.returnToCart}
          </Link>
        }
      />
    );
  }

  return null;
}

export function CheckoutDestinationSection({
  addressListUnavailable,
  addresses,
  copy,
  destination,
  locale,
  onAddAddress,
  onCancelForm,
  onChangeAddress,
  onRetry,
  onSelectAddress,
  onSubmitOneTime,
  pending,
  quote,
  quoteError,
  showForm,
}: CheckoutDestinationSectionProps) {
  if (destination.kind === "gift-missing") {
    return (
      <CheckoutStepSection id="checkout-address" step="1" title={copy.stepTitle}>
        <InlineAlert
          title={copy.giftMissingTitle}
          description={copy.giftMissingDescription}
          action={
            <Link
              href="/cart"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {copy.editGift}
            </Link>
          }
        />
      </CheckoutStepSection>
    );
  }

  const activeOneTime =
    destination.kind === "one-time" ? destination.draft : undefined;

  return (
    <CheckoutStepSection id="checkout-address" step="1" title={copy.stepTitle}>
      <div aria-busy={pending || undefined} className="space-y-3">
        {destination.kind === "gift" ? (
          <CheckoutOptionRow
            selected
            selectedLabel={copy.selectedLabel}
            title={
              <span className="flex flex-wrap items-center gap-2">
                <span>{copy.giftLabel}</span>
                <span className="font-normal">
                  {destination.recipient.name}
                </span>
              </span>
            }
            description={
              <>
                <span className="block">
                  {destination.recipient.city.name},{" "}
                  {destination.recipient.district},{" "}
                  {destination.recipient.streetDetails}
                </span>
                <bdi dir="ltr" className="mt-1 block">
                  {destination.recipient.phone}
                </bdi>
              </>
            }
          />
        ) : (
          <>
            {addressListUnavailable ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/20 bg-destructive/5 p-3 type-body-sm text-destructive"
              >
                {copy.savedUnavailable}
              </p>
            ) : null}

            {addresses.map((address) => {
              const checked =
                destination.kind === "saved" &&
                destination.addressId === address.id;

              return (
                <CheckoutOptionRow
                  key={address.id}
                  control={
                    <input
                      type="radio"
                      name="checkout-destination"
                      value={address.id}
                      checked={checked}
                      disabled={pending}
                      onChange={() => onSelectAddress(address)}
                    />
                  }
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      <span>
                        {address.label
                          ? address.label + " \u2014 " + address.recipientName
                          : address.recipientName}
                      </span>
                      {address.isDefault ? (
                        <Badge>{copy.defaultLabel}</Badge>
                      ) : null}
                    </span>
                  }
                  description={<AddressDescription address={address} />}
                />
              );
            })}

            {activeOneTime && !showForm ? (
              <CheckoutOptionRow
                control={
                  <input
                    type="radio"
                    name="checkout-destination"
                    checked
                    disabled={pending}
                    onChange={() => undefined}
                  />
                }
                title={
                  copy.oneTimeLabel +
                  " \u2014 " +
                  activeOneTime.recipientName
                }
                description={
                  <>
                    <span className="block">
                      {activeOneTime.city?.name}, {activeOneTime.district},{" "}
                      {activeOneTime.streetDetails}
                    </span>
                    <bdi dir="ltr" className="mt-1 block">
                      {activeOneTime.recipientPhone}
                    </bdi>
                  </>
                }
              />
            ) : null}

            {!showForm ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-gold-700"
                  disabled={pending}
                  onClick={onAddAddress}
                >
                  {copy.addNew}
                </Button>
                {activeOneTime ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={onChangeAddress}
                  >
                    {copy.editAddress}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 sm:p-5">
                <CheckoutOneTimeAddressForm
                  copy={copy.form}
                  initialDraft={activeOneTime}
                  locale={locale}
                  pending={pending}
                  showCancel={addresses.length > 0 || activeOneTime !== undefined}
                  onCancel={onCancelForm}
                  onSubmit={onSubmitOneTime}
                />
              </div>
            )}
          </>
        )}

        <QuoteFeedback
          copy={copy}
          destination={destination}
          pending={pending}
          quote={quote}
          quoteError={quoteError}
          onChangeAddress={onChangeAddress}
          onRetry={onRetry}
        />

        {destination.kind === "gift" ? (
          <Link
            href="/cart"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-gold-700",
            )}
          >
            {copy.editGift}
          </Link>
        ) : null}
      </div>
    </CheckoutStepSection>
  );
}

export type { CheckoutDestinationSectionProps };