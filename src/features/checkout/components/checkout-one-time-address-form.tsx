"use client";

import { useQuery } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { CityPickerDialog } from "@/components/ui/city-picker-dialog";
import { ChevronDownIcon, MapPinIcon } from "@/components/ui/icons";
import { InputField } from "@/components/ui/input";
import type { CheckoutOneTimeAddressDraft } from "@/features/checkout/components/checkout-destination.types";
import type { CheckoutQuoteResult } from "@/features/checkout/types/checkout.types";
import { cityCatalogQueryOptions } from "@/features/location/api/city-query";
import { cn } from "@/lib/utils";

type OneTimeAddressField =
  | "recipientName"
  | "recipientPhone"
  | "cityId"
  | "district"
  | "streetDetails";

export type CheckoutOneTimeAddressFormCopy = {
  fields: {
    recipientName: string;
    recipientPhone: string;
    city: string;
    district: string;
    streetDetails: string;
  };
  cityPicker: {
    select: string;
    title: string;
    description: string;
    loading: string;
    empty: string;
    unavailable: string;
    retry: string;
    close: string;
    searchLabel: string;
    searchPlaceholder: string;
    searchNoResults: string;
  };
  useAddress: string;
  usingAddress: string;
  cancel: string;
  required: string;
  validationError: string;
};

type CheckoutOneTimeAddressFormProps = {
  copy: CheckoutOneTimeAddressFormCopy;
  initialDraft?: CheckoutOneTimeAddressDraft;
  locale: Locale;
  pending: boolean;
  showCancel: boolean;
  onCancel: () => void;
  onSubmit: (
    draft: CheckoutOneTimeAddressDraft,
  ) => Promise<CheckoutQuoteResult>;
};

const emptyDraft: CheckoutOneTimeAddressDraft = {
  recipientName: "",
  recipientPhone: "",
  city: null,
  district: "",
  streetDetails: "",
};

export function CheckoutOneTimeAddressForm({
  copy,
  initialDraft,
  locale,
  onCancel,
  onSubmit,
  pending,
  showCancel,
}: CheckoutOneTimeAddressFormProps) {
  const [draft, setDraft] = useState<CheckoutOneTimeAddressDraft>(
    initialDraft ?? emptyDraft,
  );
  const [errors, setErrors] = useState<ReadonlySet<OneTimeAddressField>>(
    new Set(),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const nameId = useId();
  const phoneId = useId();
  const cityLabelId = useId();
  const cityButtonId = useId();
  const cityErrorId = useId();
  const districtId = useId();
  const streetId = useId();
  const citiesQuery = useQuery(cityCatalogQueryOptions(locale));
  const cities = citiesQuery.data ?? [];

  const updateField = (
    field: Exclude<OneTimeAddressField, "cityId">,
    value: string,
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = new Set(current);
      next.delete(field);
      return next;
    });
    setFormError(null);
  };

  const fieldError = (field: OneTimeAddressField) =>
    errors.has(field) ? copy.required : undefined;

  const validate = () => {
    const next = new Set<OneTimeAddressField>();
    if (!draft.recipientName.trim()) next.add("recipientName");
    if (!draft.recipientPhone.trim()) next.add("recipientPhone");
    if (!draft.city) next.add("cityId");
    if (!draft.district.trim()) next.add("district");
    if (!draft.streetDetails.trim()) next.add("streetDetails");
    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (nextErrors.size > 0) {
      setFormError(copy.validationError);
      return;
    }

    const normalizedDraft: CheckoutOneTimeAddressDraft = {
      recipientName: draft.recipientName.trim(),
      recipientPhone: draft.recipientPhone.trim(),
      city: draft.city,
      district: draft.district.trim(),
      streetDetails: draft.streetDetails.trim(),
    };
    const result = await onSubmit(normalizedDraft);

    if (!result.ok && result.error.code === "invalid-input") {
      const serverFields = new Set<OneTimeAddressField>();
      for (const field of result.error.fields) {
        if (field !== "addressId") serverFields.add(field);
      }
      setErrors(serverFields);
      if (serverFields.size > 0) setFormError(copy.validationError);
    }
  };

  const cityUnavailable = citiesQuery.isError;
  const cityEmpty =
    !citiesQuery.isPending && !citiesQuery.isError && cities.length === 0;
  const cityMessage =
    fieldError("cityId") ??
    (cityUnavailable ? copy.cityPicker.unavailable : undefined) ??
    (cityEmpty ? copy.cityPicker.empty : undefined);

  return (
    <>
      <form noValidate onSubmit={handleSubmit}>
        <fieldset disabled={pending}>
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id={nameId}
              name="recipientName"
              autoComplete="name"
              label={copy.fields.recipientName}
              required
              value={draft.recipientName}
              error={fieldError("recipientName")}
              onChange={(event) =>
                updateField("recipientName", event.target.value)
              }
            />
            <InputField
              id={phoneId}
              name="recipientPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              className="text-start"
              label={copy.fields.recipientPhone}
              required
              value={draft.recipientPhone}
              error={fieldError("recipientPhone")}
              onChange={(event) =>
                updateField("recipientPhone", event.target.value)
              }
            />
            <div className="flex w-full flex-col gap-1.5">
              <span
                id={cityLabelId}
                className={cn(
                  "type-label text-gray-600",
                  errors.has("cityId") && "text-destructive",
                )}
              >
                {copy.fields.city}
              </span>
              <Button
                id={cityButtonId}
                type="button"
                variant="outline"
                aria-labelledby={cityLabelId + " " + cityButtonId}
                aria-describedby={cityMessage ? cityErrorId : undefined}
                aria-invalid={errors.has("cityId") || undefined}
                className="w-full justify-between px-3.5 font-normal"
                disabled={citiesQuery.isPending || cityUnavailable || cityEmpty}
                onClick={() => setCityPickerOpen(true)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate">
                    {draft.city?.name ?? copy.cityPicker.select}
                  </span>
                </span>
                <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0" />
              </Button>
              {cityMessage ? (
                <p
                  id={cityErrorId}
                  role={cityUnavailable ? "alert" : undefined}
                  className={cn(
                    "type-caption",
                    errors.has("cityId") || cityUnavailable
                      ? "text-destructive"
                      : "text-gray-500",
                  )}
                >
                  {cityMessage}
                </p>
              ) : null}
              {cityUnavailable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  disabled={citiesQuery.isFetching}
                  onClick={() => void citiesQuery.refetch()}
                >
                  {citiesQuery.isFetching
                    ? copy.cityPicker.loading
                    : copy.cityPicker.retry}
                </Button>
              ) : null}
            </div>
            <InputField
              id={districtId}
              name="district"
              autoComplete="address-level3"
              label={copy.fields.district}
              required
              value={draft.district}
              error={fieldError("district")}
              onChange={(event) => updateField("district", event.target.value)}
            />
            <div className="sm:col-span-2">
              <InputField
                id={streetId}
                name="streetDetails"
                autoComplete="street-address"
                label={copy.fields.streetDetails}
                required
                value={draft.streetDetails}
                error={fieldError("streetDetails")}
                onChange={(event) =>
                  updateField("streetDetails", event.target.value)
                }
              />
            </div>
          </div>
        </fieldset>

        {formError ? (
          <p role="alert" className="mt-4 type-body-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {showCancel ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onCancel}
            >
              {copy.cancel}
            </Button>
          ) : null}
          <Button
            type="submit"
            loading={pending}
            loadingLabel={copy.usingAddress}
          >
            {copy.useAddress}
          </Button>
        </div>
      </form>

      <CityPickerDialog
        cities={cities}
        copy={{
          title: copy.cityPicker.title,
          description: copy.cityPicker.description,
          loading: copy.cityPicker.loading,
          empty: copy.cityPicker.empty,
          close: copy.cityPicker.close,
          searchLabel: copy.cityPicker.searchLabel,
          searchPlaceholder: copy.cityPicker.searchPlaceholder,
          searchNoResults: copy.cityPicker.searchNoResults,
        }}
        isLoading={citiesQuery.isPending}
        isOpen={cityPickerOpen}
        selectedCityId={draft.city?.id}
        onClose={() => setCityPickerOpen(false)}
        onSelect={(city) => {
          setDraft((current) => ({
            ...current,
            city: { id: city.id, name: city.name },
          }));
          setErrors((current) => {
            const next = new Set(current);
            next.delete("cityId");
            return next;
          });
          setFormError(null);
          setCityPickerOpen(false);
        }}
      />
    </>
  );
}

export type { CheckoutOneTimeAddressFormProps };