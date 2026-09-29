"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { type ChangeEvent, type FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input";
import { RafalModal } from "@/components/ui/rafal-modal";
import { Switch } from "@/components/ui/switch";
import { createAddress, updateAddress } from "@/features/addresses/actions/address-actions";
import { addressListQueryKey } from "@/features/addresses/api/address-query";
import { cityCatalogQueryOptions } from "@/features/location/api/city-query";
import type { City } from "@/features/location/types";
import type {
  Address,
  AddressInputField,
  AddressPage,
  AddressValidationErrors,
  CreateAddressInput,
  UpdateAddressInput,
} from "@/features/addresses/types/address.types";
import { useRouter } from "@/i18n/navigation";
import { rafalToast } from "@/lib/rafal-toast";
import { cn } from "@/lib/utils";

export type AddressFormCopy = {
  addTitle: string;
  editTitle: string;
  close: string;
  fields: {
    label: string;
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
    unavailableCurrent: string;
    retry: string;
  };
  defaultAddress: {
    label: string;
    helper: string;
  };
  save: string;
  saving: string;
  cancel: string;
  required: string;
  rejected: string;
  validationError: string;
  serviceError: string;
  notFound: string;
  created: string;
  updated: string;
};

type AddressDraft = {
  label: string;
  recipientName: string;
  recipientPhone: string;
  city: Pick<City, "id" | "name"> | null;
  district: string;
  streetDetails: string;
  isDefault: boolean;
};

type AddressFormProps = {
  address: Address | null;
  copy: AddressFormCopy;
  locale: Locale;
  onClose: () => void;
  open: boolean;
  returnFocusRef: React.RefObject<HTMLElement | null>;
};

function initialDraft(address: Address | null): AddressDraft {
  return {
    label: address?.label ?? "",
    recipientName: address?.recipientName ?? "",
    recipientPhone: address?.recipientPhone ?? "",
    city: address ? { id: address.city.id, name: address.city.name } : null,
    district: address?.district ?? "",
    streetDetails: address?.streetDetails ?? "",
    isDefault: address?.isDefault ?? false,
  };
}

function validateDraft(draft: AddressDraft): AddressValidationErrors {
  const errors: AddressValidationErrors = {};
  if (!draft.label.trim()) errors.label = "required";
  if (!draft.recipientName.trim()) errors.recipientName = "required";
  if (!draft.recipientPhone.trim()) errors.recipientPhone = "required";
  if (!draft.city) errors.cityId = "required";
  if (!draft.district.trim()) errors.district = "required";
  if (!draft.streetDetails.trim()) errors.streetDetails = "required";
  return errors;
}

function createInput(draft: AddressDraft): CreateAddressInput {
  return {
    label: draft.label.trim(),
    recipientName: draft.recipientName.trim(),
    recipientPhone: draft.recipientPhone.trim(),
    cityId: draft.city!.id,
    district: draft.district.trim(),
    streetDetails: draft.streetDetails.trim(),
    isDefault: draft.isDefault,
  };
}

function changedInput(address: Address, input: CreateAddressInput): UpdateAddressInput | null {
  const changed: Partial<CreateAddressInput> = {};
  if (input.label !== address.label) changed.label = input.label;
  if (input.recipientName !== address.recipientName) changed.recipientName = input.recipientName;
  if (input.recipientPhone !== address.recipientPhone) changed.recipientPhone = input.recipientPhone;
  if (input.cityId !== address.city.id) changed.cityId = input.cityId;
  if (input.district !== address.district) changed.district = input.district;
  if (input.streetDetails !== address.streetDetails) changed.streetDetails = input.streetDetails;
  if (input.isDefault !== address.isDefault) changed.isDefault = input.isDefault;
  return Object.keys(changed).length > 0 ? (changed as UpdateAddressInput) : null;
}

export function AddressForm({
  address,
  copy,
  locale,
  onClose,
  open,
  returnFocusRef,
}: AddressFormProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [draft, setDraft] = useState(() => initialDraft(address));
  const [errors, setErrors] = useState<AddressValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const labelId = useId();
  const nameId = useId();
  const phoneId = useId();
  const cityId = useId();
  const cityErrorId = useId();
  const districtId = useId();
  const streetId = useId();
  const defaultId = useId();
  const defaultHelperId = useId();
  const defaultErrorId = useId();
  const queryKey = addressListQueryKey(locale);

  const citiesQuery = useQuery(cityCatalogQueryOptions(locale));
  const cities = citiesQuery.data ?? [];
  const selectedCityAvailable =
    draft.city !== null && cities.some((city) => city.id === draft.city?.id);
  const unavailableSelectedCity =
    draft.city !== null && !selectedCityAvailable ? draft.city : null;
  const citySelectDisabled =
    citiesQuery.isPending || citiesQuery.isError || cities.length === 0;
  const cityInlineMessage = errors.cityId
    ? fieldError("cityId")
    : citiesQuery.isError
      ? copy.cityOptions.unavailable
      : cities.length === 0 && !citiesQuery.isPending
        ? copy.cityOptions.empty
        : undefined;

  const mutation = useMutation({
    mutationKey: ["account", "addresses", address ? "update" : "create"],
    mutationFn: async (input: CreateAddressInput | UpdateAddressInput) =>
      address
        ? updateAddress(address.id, input, locale)
        : createAddress(input, locale),
    retry: false,
    onSuccess: (result, input) => {
      if (!result.ok) {
        if (result.error.code === "validation-rejected") {
          setErrors(
            Object.fromEntries(
              result.error.fields.map((field) => [field, "rejected"]),
            ) as AddressValidationErrors,
          );
          setFormError(copy.validationError);
        } else if (result.error.code === "not-found") {
          setFormError(copy.notFound);
        } else {
          setFormError(copy.serviceError);
        }
        if (result.error.code === "unauthorized") router.refresh();
        return;
      }

      if (address) {
        queryClient.setQueryData<InfiniteData<AddressPage, number>>(
          queryKey,
          (current) =>
            current
              ? {
                  ...current,
                  pages: current.pages.map((page) => ({
                    ...page,
                    items: page.items.map((item) =>
                      item.id === result.address.id ? result.address : item,
                    ),
                  })),
                }
              : current,
        );
        if ("isDefault" in input) {
          void queryClient.refetchQueries({
            queryKey,
            exact: true,
            type: "active",
          });
        }
        rafalToast.success(copy.updated);
      } else {
        void queryClient.refetchQueries({
          queryKey,
          exact: true,
          type: "active",
        });
        rafalToast.success(copy.created);
      }
      onClose();
    },
    onError: () => setFormError(copy.serviceError),
  });

  const updateField = <Field extends Exclude<keyof AddressDraft, "city">>(
    field: Field,
    value: AddressDraft[Field],
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  };

  function fieldError(field: AddressInputField) {
    const error = errors[field];
    return error === "required" ? copy.required : error ? copy.rejected : undefined;
  }

  const handleCityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedCityId = Number(event.target.value);
    const selectedCity = cities.find((city) => city.id === selectedCityId);
    if (!selectedCity) return;

    setDraft((current) => ({
      ...current,
      city: { id: selectedCity.id, name: selectedCity.name },
    }));
    setErrors((current) => ({ ...current, cityId: undefined }));
    setFormError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending) return;
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError(copy.validationError);
      return;
    }

    const input = createInput(draft);
    if (address) {
      const changed = changedInput(address, input);
      if (!changed) {
        onClose();
        return;
      }
      mutation.mutate(changed);
    } else {
      mutation.mutate(input);
    }
  };

  return (
    <>
      <RafalModal
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onClose();
        }}
        title={address ? copy.editTitle : copy.addTitle}
        closeLabel={copy.close}
        showClose
        dismissible={!mutation.isPending}
        returnFocusRef={returnFocusRef}
        className="sm:max-w-2xl"
      >
        <form className="pt-2" noValidate onSubmit={handleSubmit}>
          <fieldset disabled={mutation.isPending}>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                id={labelId}
                name="addressLabel"
                label={copy.fields.label}
                required
                value={draft.label}
                error={fieldError("label")}
                onChange={(event) => updateField("label", event.target.value)}
              />
              <InputField
                id={nameId}
                name="recipientName"
                autoComplete="name"
                label={copy.fields.recipientName}
                required
                value={draft.recipientName}
                error={fieldError("recipientName")}
                onChange={(event) => updateField("recipientName", event.target.value)}
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
                onChange={(event) => updateField("recipientPhone", event.target.value)}
              />
              <div className="flex w-full flex-col gap-1.5">
                <label
                  htmlFor={cityId}
                  className={cn("type-label text-gray-600", errors.cityId && "text-destructive")}
                >
                  {copy.fields.city}
                </label>
                <select
                  id={cityId}
                  name="cityId"
                  required
                  value={draft.city ? String(draft.city.id) : ""}
                  disabled={citySelectDisabled}
                  aria-invalid={errors.cityId ? true : undefined}
                  aria-describedby={cityInlineMessage ? cityErrorId : undefined}
                  className={cn(
                    "h-11 w-full rounded-md border border-gray-200 bg-gray-0 px-3.5 text-start type-body text-gray-1000 outline-none",
                    "focus-visible:border-[length:var(--border-width-emphasis)] focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
                    errors.cityId && "border-destructive",
                  )}
                  onChange={handleCityChange}
                >
                  {citiesQuery.isPending ? (
                    <option value="">{copy.cityOptions.loading}</option>
                  ) : null}
                  {citiesQuery.isError && unavailableSelectedCity === null ? (
                    <option value="">{copy.cityOptions.unavailable}</option>
                  ) : null}
                  {!citiesQuery.isPending &&
                  !citiesQuery.isError &&
                  cities.length === 0 &&
                  unavailableSelectedCity === null ? (
                    <option value="">{copy.cityOptions.empty}</option>
                  ) : null}
                  {!citiesQuery.isPending &&
                  !citiesQuery.isError &&
                  cities.length > 0 &&
                  draft.city === null ? (
                    <option value="" disabled>
                      {copy.cityOptions.select}
                    </option>
                  ) : null}
                  {!citiesQuery.isPending && unavailableSelectedCity ? (
                    <option
                      value={String(unavailableSelectedCity.id)}
                      disabled
                    >
                      {unavailableSelectedCity.name} (
                      {copy.cityOptions.unavailableCurrent})
                    </option>
                  ) : null}
                  {cities.map((city) => (
                    <option key={city.id} value={String(city.id)}>
                      {city.name}
                    </option>
                  ))}
                </select>
                <div className="flex min-h-11 items-center justify-between gap-2">
                  {cityInlineMessage ? (
                    <p
                      id={cityErrorId}
                      role={citiesQuery.isError ? "alert" : undefined}
                      className={cn(
                        "type-caption",
                        errors.cityId || citiesQuery.isError
                          ? "text-destructive"
                          : "text-gray-500",
                      )}
                    >
                      {cityInlineMessage}
                    </p>
                  ) : null}
                  {citiesQuery.isError ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-11"
                      disabled={citiesQuery.isFetching}
                      onClick={() => void citiesQuery.refetch()}
                    >
                      {citiesQuery.isFetching
                        ? copy.cityOptions.loading
                        : copy.cityOptions.retry}
                    </Button>
                  ) : null}
                </div>
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
              <InputField
                id={streetId}
                name="streetDetails"
                autoComplete="street-address"
                label={copy.fields.streetDetails}
                required
                value={draft.streetDetails}
                error={fieldError("streetDetails")}
                onChange={(event) => updateField("streetDetails", event.target.value)}
              />
              <div className="flex min-h-20 items-center justify-between gap-5 sm:col-span-2">
                <div className="min-w-0 py-3">
                  <label
                    htmlFor={defaultId}
                    className="type-body font-medium text-gray-1000"
                  >
                    {copy.defaultAddress.label}
                  </label>
                  <p
                    id={defaultHelperId}
                    className="mt-1 type-body-sm text-gray-500"
                  >
                    {copy.defaultAddress.helper}
                  </p>
                  {errors.isDefault ? (
                    <p
                      id={defaultErrorId}
                      className="mt-1 type-caption text-destructive"
                    >
                      {fieldError("isDefault")}
                    </p>
                  ) : null}
                </div>
                <Switch
                  id={defaultId}
                  checked={draft.isDefault}
                  aria-describedby={
                    errors.isDefault
                      ? `${defaultHelperId} ${defaultErrorId}`
                      : defaultHelperId
                  }
                  aria-invalid={errors.isDefault ? true : undefined}
                  aria-label={copy.defaultAddress.label}
                  onCheckedChange={(checked) =>
                    updateField("isDefault", checked)
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

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              {copy.cancel}
            </Button>
            <Button
              type="submit"
              loading={mutation.isPending}
              loadingLabel={copy.saving}
            >
              {copy.save}
            </Button>
          </div>
        </form>
      </RafalModal>

    </>
  );
}
