"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { Locale } from "next-intl";

import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input";
import { updateAccountProfile } from "@/features/account/profile/actions/update-account-profile";
import type {
  AccountProfile,
  AccountProfileField,
  AccountProfileInput,
  AccountProfileValidationError,
  AccountProfileValidationErrors,
} from "@/features/account/profile/types/account-profile.types";
import { validateAccountProfile } from "@/features/account/profile/utils/validate-account-profile";
import { rafalToast } from "@/lib/rafal-toast";

export type ProfileFormCopy = {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  save: string;
  saving: string;
  saved: string;
  saveError: string;
  validation: Record<AccountProfileValidationError, string>;
};

type ProfileFormProps = {
  copy: ProfileFormCopy;
  locale: Locale;
  profile: AccountProfile;
};

export function ProfileForm({ copy, locale, profile }: ProfileFormProps) {
  const [values, setValues] = useState<AccountProfileInput>({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
  });
  const [errors, setErrors] = useState<AccountProfileValidationErrors>({});
  const [pending, startTransition] = useTransition();

  const updateField = (field: AccountProfileField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const fieldError = (field: AccountProfileField) => {
    const error = errors[field];
    return error ? copy.validation[error] : undefined;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateAccountProfile(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    startTransition(async () => {
      try {
        const result = await updateAccountProfile({ locale, ...values });
        if (!result.ok) {
          if (result.error.code === "invalid-input") {
            if (Object.keys(result.error.fields).length > 0) {
              setErrors(result.error.fields);
            } else {
              rafalToast.error(copy.saveError);
            }
          } else {
            rafalToast.error(copy.saveError);
          }
          return;
        }
        setValues(result.profile);
        rafalToast.success(copy.saved);
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
      <h1 id="profile-form-title" className="text-h3 font-bold text-gray-1000">
        {copy.title}
      </h1>

      <fieldset
        aria-labelledby="profile-form-title"
        className="mt-6"
        disabled={pending}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            id="account-first-name"
            name="firstName"
            autoComplete="given-name"
            label={copy.firstName}
            value={values.firstName}
            error={fieldError("firstName")}
            onChange={(event) => updateField("firstName", event.target.value)}
          />
          <InputField
            id="account-last-name"
            name="lastName"
            autoComplete="family-name"
            label={copy.lastName}
            value={values.lastName}
            error={fieldError("lastName")}
            onChange={(event) => updateField("lastName", event.target.value)}
          />
          <div className="sm:col-span-2">
            <InputField
              id="account-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              className="text-start"
              label={copy.email}
              value={profile.email}
              readOnly
            />
          </div>
          <div className="sm:col-span-2">
            <InputField
              id="account-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              className="text-start"
              label={copy.phone}
              value={values.phone}
              error={fieldError("phone")}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <div className="mt-5 flex sm:justify-end">
        <Button
          type="submit"
          loading={pending}
          loadingLabel={copy.saving}
          className="w-full sm:w-auto"
        >
          {copy.save}
        </Button>
      </div>
    </form>
  );
}
