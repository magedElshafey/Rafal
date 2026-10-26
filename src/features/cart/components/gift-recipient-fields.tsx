"use client";

import { useQuery } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldFeedback } from "@/components/ui/field";
import { CityPickerDialog } from "@/components/ui/city-picker-dialog";
import { InputField } from "@/components/ui/input";
import { SaudiMobileField } from "@/components/ui/saudi-mobile-field";
import type { CartGiftRecipient } from "@/features/cart/types/cart.types";
import { cityCatalogQueryOptions } from "@/features/location/api/city-query";
import type { City } from "@/features/location/types";
import { AddressMapPicker } from "@/features/addresses/components/address-map-picker";
import { createAddressSuggestionGuard } from "@/features/addresses/utils/merge-address-suggestion";
import { cityOptionLabel } from "@/features/location/city-option-label";
import {
  formatSaudiMobileForInput,
  normalizeSaudiMobile,
} from "@/lib/phone/saudi-mobile";

export type GiftRecipientDraft = {
  name: string;
  phone: string;
  city: Pick<City, "id" | "name"> | null;
  district: string;
  streetDetails: string;
};

export type GiftRecipientDraftField = keyof GiftRecipientDraft;
export type GiftRecipientDraftErrors = Partial<
  Record<GiftRecipientDraftField, string>
>;

export type GiftRecipientFieldsCopy = {
  name: string;
  phone: string;
  city: string;
  district: string;
  streetDetails: string;
  selectCity: string;
  cityDialog: {
    title: string;
    description: string;
    loading: string;
    empty: string;
    unavailable: string;
    close: string;
    searchLabel: string;
    searchPlaceholder: string;
    searchNoResults: string;
  };
};

export function emptyGiftRecipientDraft(): GiftRecipientDraft {
  return {
    name: "",
    phone: "",
    city: null,
    district: "",
    streetDetails: "",
  };
}

export function giftRecipientDraft(
  recipient: CartGiftRecipient,
): GiftRecipientDraft {
  return {
    name: recipient.name,
    phone: formatSaudiMobileForInput(recipient.phone),
    city: recipient.city,
    district: recipient.district,
    streetDetails: recipient.streetDetails,
  };
}

export function validateGiftRecipientDraft<ErrorKey extends string>(
  draft: GiftRecipientDraft,
  requiredMessage: ErrorKey,
  invalidPhoneMessage: ErrorKey,
): Partial<Record<GiftRecipientDraftField, ErrorKey>> {
  const errors: Partial<Record<GiftRecipientDraftField, ErrorKey>> = {};
  if (!draft.name.trim()) errors.name = requiredMessage;
  if (!draft.phone.trim()) errors.phone = requiredMessage;
  else if (!normalizeSaudiMobile(draft.phone)) {
    errors.phone = invalidPhoneMessage;
  }
  if (!draft.city) errors.city = requiredMessage;
  if (!draft.district.trim()) errors.district = requiredMessage;
  if (!draft.streetDetails.trim()) errors.streetDetails = requiredMessage;
  return errors;
}

export function canonicalGiftRecipientDraft(
  draft: GiftRecipientDraft,
): GiftRecipientDraft | null {
  const phone = normalizeSaudiMobile(draft.phone);
  if (!phone || !draft.city) return null;

  return {
    name: draft.name.trim(),
    phone,
    city: draft.city,
    district: draft.district.trim(),
    streetDetails: draft.streetDetails.trim(),
  };
}

export function GiftRecipientFields({
  busy,
  copy,
  draft,
  errors,
  feedbackMessages,
  phoneFeedbackMessages = feedbackMessages,
  locale,
  onChange,
}: {
  busy: boolean;
  copy: GiftRecipientFieldsCopy;
  draft: GiftRecipientDraft;
  errors: GiftRecipientDraftErrors;
  feedbackMessages: readonly string[];
  phoneFeedbackMessages?: readonly string[];
  locale: Locale;
  onChange: <Field extends GiftRecipientDraftField>(
    field: Field,
    value: GiftRecipientDraft[Field],
  ) => void;
}) {
  const id = useId();
  const [cityOpen, setCityOpen] = useState(false);
  const [mapFields] = useState(() => createAddressSuggestionGuard(draft));
  const cities = useQuery({
    ...cityCatalogQueryOptions(locale),
    enabled: cityOpen,
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField
        feedbackMessages={feedbackMessages}
        id={`${id}-name`}
        name="name"
        autoComplete="name"
        label={copy.name}
        required
        value={draft.name}
        error={errors.name}
        onChange={(event) => onChange("name", event.target.value)}
      />
      <SaudiMobileField
        feedbackMessages={phoneFeedbackMessages}
        id={`${id}-phone`}
        name="phone"
        label={copy.phone}
        required
        value={draft.phone}
        error={errors.phone}
        onChange={(event) => onChange("phone", event.target.value)}
      />
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor={`${id}-city`} className="type-label text-gray-600">
          {copy.city}
        </label>
        <Button
          id={`${id}-city`}
          type="button"
          variant="outline"
          aria-haspopup="dialog"
          aria-expanded={cityOpen}
          aria-invalid={Boolean(errors.city) || undefined}
          aria-describedby={errors.city ? `${id}-city-error` : undefined}
          className="w-full justify-start border border-gray-200 bg-gray-0 font-normal"
          disabled={busy}
          onClick={() => setCityOpen(true)}
        >
          {draft.city?.name ?? copy.selectCity}
        </Button>
        <FieldFeedback id={`${id}-city-error`} reserve={feedbackMessages}>
            {errors.city}
          </FieldFeedback>
      </div>
      <InputField
        feedbackMessages={feedbackMessages}
        id={`${id}-district`}
        name="district"
        autoComplete="address-level3"
        label={copy.district}
        required
        value={draft.district}
        error={errors.district}
        onChange={(event) => { mapFields.manual("district"); onChange("district", event.target.value); }}
      />
      <InputField
        feedbackMessages={feedbackMessages}
        id={`${id}-street-details`}
        name="streetDetails"
        autoComplete="street-address"
        label={copy.streetDetails}
        required
        value={draft.streetDetails}
        error={errors.streetDetails}
        onChange={(event) => { mapFields.manual("streetDetails"); onChange("streetDetails", event.target.value); }}
      />

      <AddressMapPicker cityId={draft.city?.id ?? null} disabled={busy} onCityChange={city => onChange("city", city)} onSuggestion={(suggestion, replace) => {
        const patch = mapFields.merge(draft, suggestion, replace);
        if (patch.district !== undefined) onChange("district", patch.district);
        if (patch.streetDetails !== undefined) onChange("streetDetails", patch.streetDetails);
      }} />
      {cityOpen ? (
        <CityPickerDialog
          cities={cities.data ?? []}
          getOptionLabel={(city) => cityOptionLabel(city, cities.data ?? [])}
          copy={{
            title: copy.cityDialog.title,
            description: copy.cityDialog.description,
            loading: copy.cityDialog.loading,
            empty: cities.isError
              ? copy.cityDialog.unavailable
              : copy.cityDialog.empty,
            close: copy.cityDialog.close,
            searchLabel: copy.cityDialog.searchLabel,
            searchPlaceholder: copy.cityDialog.searchPlaceholder,
            searchNoResults: copy.cityDialog.searchNoResults,
          }}
          isOpen
          isLoading={cities.isPending}
          selectedCityId={draft.city?.id}
          onClose={() => setCityOpen(false)}
          onSelect={(city) => {
            onChange("city", city);
            setCityOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
