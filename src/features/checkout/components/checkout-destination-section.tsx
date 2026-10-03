"use client";

import { useQuery } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InputField } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SaudiMobileField } from "@/components/ui/saudi-mobile-field";
import type { Address } from "@/features/addresses/types/address.types";
import type { CartSnapshot } from "@/features/cart/types/cart.types";
import {
  CheckoutGiftRecipientEditor,
  type CheckoutGiftRecipientEditorCopy,
} from "@/features/checkout/components/checkout-gift-recipient-editor";
import { CheckoutStepSection } from "@/features/checkout/components/checkout-step-section";
import type {
  CheckoutAddress,
  CheckoutDestination,
} from "@/features/checkout/types/checkout.types";
import { cityCatalogQueryOptions } from "@/features/location/api/city-query";
import type { City } from "@/features/location/types";
import {
  formatSaudiMobileForDisplay,
  formatSaudiMobileForInput,
  normalizeSaudiMobile,
} from "@/lib/phone/saudi-mobile";
import { cn } from "@/lib/utils";

export type CheckoutDestinationCopy = {
  title: string;
  gift: {
    label: string;
    description: string;
    editor: CheckoutGiftRecipientEditorCopy;
  };
  saved: {
    title: string;
    defaultLabel: string;
    unavailable: string;
  };
  oneTime: {
    show: string;
    hide: string;
    committed: string;
    submit: string;
  };
  fields: {
    recipientName: string;
    recipientPhone: string;
    city: string;
    district: string;
    streetDetails: string;
  };
  cityOptions: {
    select: string;
    loading: string;
    empty: string;
    unavailable: string;
    retry: string;
  };
  errors: {
    required: string;
    invalidPhone: string;
    validation: string;
  };
};

type CheckoutDestinationSectionProps = {
  addresses: readonly Address[];
  addressesUnavailable: boolean;
  committedDestination: CheckoutDestination | null;
  copy: CheckoutDestinationCopy;
  gift: CartSnapshot["gift"] | null;
  giftMutationDisabled: boolean;
  isAuthenticated: boolean;
  locale: Locale;
  onCommit: (destination: CheckoutDestination) => void;
  onGiftPendingChange: (pending: boolean) => void;
  onGiftPersisted: (gift: CartSnapshot["gift"]) => void;
};

type AddressDraft = {
  recipientName: string;
  recipientPhone: string;
  city: Pick<City, "id" | "name"> | null;
  district: string;
  streetDetails: string;
};

type DraftField = Exclude<keyof AddressDraft, "city"> | "city";
type DraftErrors = Partial<Record<DraftField, string>>;

const emptyDraft: AddressDraft = {
  recipientName: "",
  recipientPhone: "",
  city: null,
  district: "",
  streetDetails: "",
};

function draftFromCommittedAddress(
  committedAddress: CheckoutAddress | null,
): AddressDraft {
  if (!committedAddress) return emptyDraft;

  return {
    recipientName: committedAddress.recipientName,
    recipientPhone: formatSaudiMobileForInput(
      committedAddress.recipientPhone,
    ),
    city: { id: committedAddress.cityId, name: "" },
    district: committedAddress.district,
    streetDetails: committedAddress.streetDetails,
  };
}

function parseBackendId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function savedDestination(
  address: Address,
): Extract<CheckoutDestination, { kind: "saved-address" }> | null {
  const addressId = parseBackendId(address.id);
  return addressId
    ? { kind: "saved-address", addressId, cityId: address.city.id }
    : null;
}

function DestinationAddress({
  city,
  district,
  name,
  phone,
  streetDetails,
}: {
  city: string;
  district: string;
  name: string;
  phone: string;
  streetDetails: string;
}) {
  return (
    <address className="not-italic">
      <strong className="block type-body font-medium text-gray-1000">
        {name}
      </strong>
      <bdi dir="ltr" className="mt-1 block type-body-sm text-gray-600">
        {formatSaudiMobileForDisplay(phone)}
      </bdi>
      <span className="mt-2 block type-body-sm text-gray-600">
        {city}، {district}، {streetDetails}
      </span>
    </address>
  );
}

function OneTimeAddressForm({
  committedAddress,
  copy,
  locale,
  onCommit,
}: {
  committedAddress: CheckoutAddress | null;
  copy: CheckoutDestinationCopy;
  locale: Locale;
  onCommit: (destination: CheckoutDestination) => void;
}) {
  const [draft, setDraft] = useState<AddressDraft>(() =>
    draftFromCommittedAddress(committedAddress),
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const citiesQuery = useQuery(cityCatalogQueryOptions(locale));
  const cities = citiesQuery.data ?? [];
  const draftMatchesCommitted =
    committedAddress !== null &&
    draft.recipientName.trim() === committedAddress.recipientName &&
    normalizeSaudiMobile(draft.recipientPhone) ===
      committedAddress.recipientPhone &&
    draft.city?.id === committedAddress.cityId &&
    draft.district.trim() === committedAddress.district &&
    draft.streetDetails.trim() === committedAddress.streetDetails;

  const updateField = <FieldName extends Exclude<keyof AddressDraft, "city">>(
    field: FieldName,
    value: AddressDraft[FieldName],
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: DraftErrors = {};
    if (!draft.recipientName.trim()) {
      nextErrors.recipientName = copy.errors.required;
    }

    const normalizedPhone = normalizeSaudiMobile(draft.recipientPhone);
    if (!draft.recipientPhone.trim()) {
      nextErrors.recipientPhone = copy.errors.required;
    } else if (!normalizedPhone) {
      nextErrors.recipientPhone = copy.errors.invalidPhone;
    }
    if (!draft.city) nextErrors.city = copy.errors.required;
    if (!draft.district.trim()) nextErrors.district = copy.errors.required;
    if (!draft.streetDetails.trim()) {
      nextErrors.streetDetails = copy.errors.required;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !draft.city || !normalizedPhone) {
      setFormError(copy.errors.validation);
      return;
    }

    const address: CheckoutAddress = {
      recipientName: draft.recipientName.trim(),
      recipientPhone: normalizedPhone,
      cityId: draft.city.id,
      district: draft.district.trim(),
      streetDetails: draft.streetDetails.trim(),
    };
    setFormError(null);
    onCommit({ kind: "one-time-address", address });
  };

  const cityMessage = errors.city
    ? errors.city
    : citiesQuery.isError
      ? copy.cityOptions.unavailable
      : cities.length === 0 && !citiesQuery.isPending
        ? copy.cityOptions.empty
        : undefined;

  return (
    <form noValidate onSubmit={submit} className="rounded-md bg-gray-50 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          id="checkout-recipient-name"
          name="recipientName"
          autoComplete="name"
          required
          label={copy.fields.recipientName}
          value={draft.recipientName}
          error={errors.recipientName}
          onChange={(event) =>
            updateField("recipientName", event.target.value)
          }
        />
        <SaudiMobileField
          id="checkout-recipient-phone"
          name="recipientPhone"
          required
          label={copy.fields.recipientPhone}
          value={draft.recipientPhone}
          error={errors.recipientPhone}
          onChange={(event) =>
            updateField("recipientPhone", event.target.value)
          }
        />
        <Field>
          <FieldLabel
            htmlFor="checkout-city"
            className={cn(errors.city && "text-destructive")}
          >
            {copy.fields.city}
          </FieldLabel>
          <NativeSelect
            id="checkout-city"
            name="cityId"
            required
            invalid={Boolean(errors.city)}
            disabled={citiesQuery.isPending || citiesQuery.isError}
            value={draft.city ? String(draft.city.id) : ""}
            aria-describedby={cityMessage ? "checkout-city-message" : undefined}
            onChange={(event) => {
              const selectedId = Number(event.target.value);
              const city = cities.find((item) => item.id === selectedId);
              if (!city) return;
              setDraft((current) => ({
                ...current,
                city: { id: city.id, name: city.name },
              }));
              setErrors((current) => ({ ...current, city: undefined }));
              setFormError(null);
            }}
          >
            <option value="" disabled>
              {citiesQuery.isPending
                ? copy.cityOptions.loading
                : copy.cityOptions.select}
            </option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </NativeSelect>
          {cityMessage ? (
            <FieldError id="checkout-city-message">{cityMessage}</FieldError>
          ) : null}
          {citiesQuery.isError ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              loading={citiesQuery.isFetching}
              loadingLabel={copy.cityOptions.loading}
              onClick={() => void citiesQuery.refetch()}
            >
              {copy.cityOptions.retry}
            </Button>
          ) : null}
        </Field>
        <InputField
          id="checkout-district"
          name="district"
          autoComplete="address-level3"
          required
          label={copy.fields.district}
          value={draft.district}
          error={errors.district}
          onChange={(event) => updateField("district", event.target.value)}
        />
        <div className="sm:col-span-2">
          <InputField
            id="checkout-street-details"
            name="streetDetails"
            autoComplete="street-address"
            required
            label={copy.fields.streetDetails}
            value={draft.streetDetails}
            error={errors.streetDetails}
            onChange={(event) =>
              updateField("streetDetails", event.target.value)
            }
          />
        </div>
      </div>
      {formError ? (
        <p role="alert" className="mt-4 type-body-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit">{copy.oneTime.submit}</Button>
        {draftMatchesCommitted ? (
          <p role="status" className="type-body-sm text-success">
            {copy.oneTime.committed}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function CheckoutDestinationSection({
  addresses,
  addressesUnavailable,
  committedDestination,
  copy,
  gift,
  giftMutationDisabled,
  isAuthenticated,
  locale,
  onCommit,
  onGiftPendingChange,
  onGiftPersisted,
}: CheckoutDestinationSectionProps) {
  const giftRecipient = gift?.isGift ? gift.recipient : null;
  const [showOneTime, setShowOneTime] = useState(
    giftRecipient === null && addresses.length === 0,
  );
  const hasCommittedOneTimeAddress =
    committedDestination?.kind === "one-time-address";
  const showOneTimeEditor = showOneTime || hasCommittedOneTimeAddress;

  if (giftRecipient && gift) {
    return (
      <CheckoutStepSection id="checkout-destination" step="1" title={copy.title}>
        <div className="rounded-md border border-gold-500 bg-gold-50/50 p-4">
          <p className="type-label text-gold-700">{copy.gift.label}</p>
          <p className="mt-1 type-body-sm text-gray-600">
            {copy.gift.description}
          </p>
          <div className="mt-4">
            <DestinationAddress
              name={giftRecipient.name}
              phone={giftRecipient.phone}
              city={giftRecipient.city.name}
              district={giftRecipient.district}
              streetDetails={giftRecipient.streetDetails}
            />
          </div>
          <CheckoutGiftRecipientEditor
            copy={copy.gift.editor}
            disabled={giftMutationDisabled}
            gift={gift}
            locale={locale}
            onPendingChange={onGiftPendingChange}
            onPersisted={onGiftPersisted}
          />
        </div>
      </CheckoutStepSection>
    );
  }

  return (
    <CheckoutStepSection id="checkout-destination" step="1" title={copy.title}>
      {isAuthenticated && addresses.length > 0 ? (
        <fieldset>
          <legend className="type-body font-medium text-gray-800">
            {copy.saved.title}
          </legend>
          <ul className="mt-3 grid gap-3">
            {addresses.map((address) => {
              const destination = savedDestination(address);
              const selected =
                destination !== null &&
                committedDestination?.kind === "saved-address" &&
                committedDestination.addressId === destination.addressId;
              return (
                <li key={address.id}>
                  <label
                    className={cn(
                      "block cursor-pointer rounded-md border p-4 transition-colors motion-reduce:transition-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                      selected
                        ? "border-gold-500 bg-gold-50/40"
                        : "border-gray-200 hover:border-gray-300",
                      !destination && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <input
                      type="radio"
                      name="checkout-saved-address"
                      className="sr-only"
                      checked={selected}
                      disabled={!destination}
                      onChange={() => {
                        if (!destination) return;
                        setShowOneTime(false);
                        onCommit(destination);
                      }}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <span className="type-body font-medium text-gray-1000">
                        {address.label}
                      </span>
                      {address.isDefault ? (
                        <span className="rounded-full bg-gold-50 px-2 py-1 type-caption text-gold-700">
                          {copy.saved.defaultLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <DestinationAddress
                        name={address.recipientName}
                        phone={address.recipientPhone}
                        city={address.city.name}
                        district={address.district}
                        streetDetails={address.streetDetails}
                      />
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      {isAuthenticated && addressesUnavailable ? (
        <p role="status" className="type-body-sm text-gold-700">
          {copy.saved.unavailable}
        </p>
      ) : null}

      {isAuthenticated &&
      addresses.length > 0 &&
      !hasCommittedOneTimeAddress ? (
        <Button
          type="button"
          variant="ghost"
          className="mt-4 px-0 text-gold-700"
          onClick={() => setShowOneTime((current) => !current)}
        >
          {showOneTime ? copy.oneTime.hide : copy.oneTime.show}
        </Button>
      ) : null}

      {showOneTimeEditor ? (
        <div className={cn(isAuthenticated && addresses.length > 0 && "mt-4")}>
          <OneTimeAddressForm
            committedAddress={
              committedDestination?.kind === "one-time-address"
                ? committedDestination.address
                : null
            }
            copy={copy}
            locale={locale}
            onCommit={onCommit}
          />
        </div>
      ) : null}
    </CheckoutStepSection>
  );
}
