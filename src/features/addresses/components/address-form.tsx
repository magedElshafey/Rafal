"use client";

import { useState, useTransition, type FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputField } from "@/components/ui/input";
import {
  createAddress,
  updateAddress,
} from "@/features/addresses/actions/address-actions";
import {
  addressTypeValues,
  type AddressField,
  type AddressInput,
  type AddressType,
  type AddressValidationError,
  type AddressValidationErrors,
} from "@/features/addresses/types/saved-address.types";
import { validateAddress } from "@/features/addresses/utils/validate-address";
import { Link } from "@/i18n/navigation";
import { rafalToast } from "@/lib/rafal-toast";
import { cn } from "@/lib/utils";

export type AddressFormCopy = {
  sectionTitle: string;
  fields: {
    fullName: string;
    phone: string;
    city: string;
    district: string;
    street: string;
    additionalDetails: string;
    postalCode: string;
    postalCodeOptional: string;
  };
  type: {
    label: string;
    home: string;
    work: string;
  };
  isDefault: string;
  save: string;
  saving: string;
  cancel: string;
  savedPreview: string;
  saveError: string;
  maximumReached: string;
  validation: Record<AddressValidationError, string>;
};

type AddressFormBaseProps = {
  copy: AddressFormCopy;
  initialValues: AddressInput;
};

type AddressFormProps = AddressFormBaseProps &
  (
    | {
        mode: "create";
        addressId?: never;
      }
    | {
        mode: "edit";
        addressId: string;
      }
  );

export function AddressForm(props: AddressFormProps) {
  const { copy, initialValues } = props;
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<AddressValidationErrors>({});
  const [pending, startTransition] = useTransition();

  const updateField = <Field extends keyof AddressInput,>(
    field: Field,
    value: AddressInput[Field],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (field !== "isDefault") {
      setErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[field as AddressField];
        return nextErrors;
      });
    }
  };

  const fieldError = (field: AddressField) => {
    const error = errors[field];
    return error ? copy.validation[error] : undefined;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateAddress(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    startTransition(async () => {
      try {
        const result =
          props.mode === "create"
            ? await createAddress(values)
            : await updateAddress(props.addressId, values);

        if (!result.ok) {
          if (result.reason === "validation" && result.errors) {
            setErrors(result.errors);
            return;
          }

          rafalToast.error(
            result.reason === "maximum-reached"
              ? copy.maximumReached
              : copy.saveError,
          );
          return;
        }

        rafalToast.success(copy.savedPreview);
      } catch {
        rafalToast.error(copy.saveError);
      }
    });
  };

  return (
    <form
      className="rounded-lg border border-gray-200 bg-gray-0 p-5 sm:p-8"
      onSubmit={handleSubmit}
      noValidate
    >
      <h2 id="address-form-title" className="text-h3 font-bold text-gray-1000">
        {copy.sectionTitle}
      </h2>

      <fieldset
        aria-labelledby="address-form-title"
        className="mt-6"
        disabled={pending}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            id="address-full-name"
            name="fullName"
            autoComplete="name"
            required
            label={copy.fields.fullName}
            value={values.fullName}
            error={fieldError("fullName")}
            onChange={(event) => updateField("fullName", event.target.value)}
          />
          <InputField
            id="address-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            dir="ltr"
            className="text-start"
            label={copy.fields.phone}
            value={values.phone}
            error={fieldError("phone")}
            onChange={(event) => updateField("phone", event.target.value)}
          />
          <InputField
            id="address-city"
            name="city"
            autoComplete="address-level2"
            required
            label={copy.fields.city}
            value={values.city}
            error={fieldError("city")}
            onChange={(event) => updateField("city", event.target.value)}
          />
          <InputField
            id="address-district"
            name="district"
            autoComplete="address-level3"
            required
            label={copy.fields.district}
            value={values.district}
            error={fieldError("district")}
            onChange={(event) => updateField("district", event.target.value)}
          />
          <div className="sm:col-span-2">
            <InputField
              id="address-street"
              name="street"
              autoComplete="street-address"
              required
              label={copy.fields.street}
              value={values.street}
              error={fieldError("street")}
              onChange={(event) => updateField("street", event.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <InputField
              id="address-additional-details"
              name="additionalDetails"
              label={copy.fields.additionalDetails}
              value={values.additionalDetails}
              error={fieldError("additionalDetails")}
              onChange={(event) =>
                updateField("additionalDetails", event.target.value)
              }
            />
          </div>
          <div className="sm:col-span-2">
            <InputField
              id="address-postal-code"
              name="postalCode"
              inputMode="numeric"
              autoComplete="postal-code"
              label={copy.fields.postalCode}
              helperText={copy.fields.postalCodeOptional}
              value={values.postalCode}
              error={fieldError("postalCode")}
              onChange={(event) =>
                updateField("postalCode", event.target.value)
              }
            />
          </div>
        </div>

        <fieldset
          className="mt-5"
          aria-invalid={Boolean(errors.type) || undefined}
          aria-describedby={errors.type ? "address-type-error" : undefined}
        >
          <legend className="type-label text-gray-600">{copy.type.label}</legend>
          <div className="mt-2 flex gap-2">
            {addressTypeValues.map((type: AddressType) => (
              <label key={type} className="cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={type}
                  required
                  checked={values.type === type}
                  onChange={() => updateField("type", type)}
                  className="peer sr-only"
                />
                <span className="inline-flex h-9 min-w-16 items-center justify-center rounded-full bg-gray-100 px-4 type-ui-sm text-gray-700 peer-checked:bg-success peer-checked:text-gray-0 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
                  {copy.type[type]}
                </span>
              </label>
            ))}
          </div>
          {errors.type ? (
            <p
              id="address-type-error"
              className="mt-1.5 type-caption text-destructive"
            >
              {copy.validation[errors.type]}
            </p>
          ) : null}
        </fieldset>

        <div className="mt-6 flex items-center gap-2">
          <Checkbox
            id="address-is-default"
            name="isDefault"
            checked={values.isDefault}
            aria-invalid={Boolean(errors.isDefault) || undefined}
            aria-describedby={
              errors.isDefault ? "address-is-default-error" : undefined
            }
            onCheckedChange={(checked) =>
              updateField("isDefault", checked === true)
            }
          />
          <label
            htmlFor="address-is-default"
            className="type-body text-gray-700"
          >
            {copy.isDefault}
          </label>
        </div>
        {errors.isDefault ? (
          <p
            id="address-is-default-error"
            className="mt-1.5 type-caption text-destructive"
          >
            {copy.validation[errors.isDefault]}
          </p>
        ) : null}
      </fieldset>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          type="submit"
          loading={pending}
          loadingLabel={copy.saving}
          className="w-full sm:w-auto"
        >
          {copy.save}
        </Button>
        <Link
          href="/account/addresses"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full sm:w-auto",
          )}
        >
          {copy.cancel}
        </Link>
      </div>
    </form>
  );
}
