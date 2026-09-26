"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { Locale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SaudiFlagIcon } from "@/components/ui/icons";
import { InputField, PhoneInputField } from "@/components/ui/input";
import { completeProfile } from "@/features/auth/actions/complete-profile";
import { useRouter } from "@/i18n/navigation";

export type CompleteProfileFormCopy = {
  firstName: string;
  firstNamePlaceholder: string;
  lastName: string;
  lastNamePlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  terms: string;
  submit: string;
  submitting: string;
  required: string;
  invalidField: string;
  invalidPhone: string;
  termsRequired: string;
  unavailable: string;
};

type CompleteProfileFormProps = {
  copy: CompleteProfileFormCopy;
  locale: Locale;
  returnTo: string;
};

type ProfileValues = { firstName: string; lastName: string; phone: string };
type ProfileErrors = Partial<
  Record<keyof ProfileValues | "termsAccepted", string>
>;

export function CompleteProfileForm({
  copy,
  locale,
  returnTo,
}: CompleteProfileFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileValues>({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const updateValue = (field: keyof ProfileValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(undefined);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: ProfileErrors = {};
    if (!values.firstName.trim()) nextErrors.firstName = copy.required;
    if (!values.lastName.trim()) nextErrors.lastName = copy.required;
    if (!values.phone.trim()) nextErrors.phone = copy.required;
    if (!termsAccepted) nextErrors.termsAccepted = copy.termsRequired;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    startTransition(async () => {
      try {
        const result = await completeProfile(
          { ...values, termsAccepted },
          locale,
        );
        if (!result.ok) {
          if (result.error.code === "unauthorized") {
            router.replace({
              pathname: "/login",
              query: { returnTo, state: "session-expired" },
            });
            return;
          }
          if (
            result.error.code === "invalid-input" &&
            result.error.fields?.length
          ) {
            const backendErrors: ProfileErrors = {};
            for (const field of result.error.fields) {
              backendErrors[field] =
                field === "phone"
                  ? copy.invalidPhone
                  : field === "termsAccepted"
                    ? copy.termsRequired
                    : copy.invalidField;
            }
            setErrors(backendErrors);
            setFormError(undefined);
            return;
          }
          setFormError(
            result.error.code === "invalid-input"
              ? copy.invalidField
              : copy.unavailable,
          );
          return;
        }
        router.replace(returnTo);
      } catch {
        setFormError(copy.unavailable);
      }
    });
  };

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
      <fieldset disabled={pending} className="contents">
        <InputField
          id="first-name"
          name="firstName"
          autoComplete="given-name"
          required
          label={copy.firstName}
          placeholder={copy.firstNamePlaceholder}
          value={values.firstName}
          error={errors.firstName}
          onChange={(event) => updateValue("firstName", event.target.value)}
        />
        <InputField
          id="last-name"
          name="lastName"
          autoComplete="family-name"
          required
          label={copy.lastName}
          placeholder={copy.lastNamePlaceholder}
          value={values.lastName}
          error={errors.lastName}
          onChange={(event) => updateValue("lastName", event.target.value)}
        />
        <PhoneInputField
          id="mobile-number"
          name="phone"
          autoComplete="tel-national"
          required
          label={copy.phone}
          countryCode="+966"
          countryFlag={<SaudiFlagIcon className="size-full" />}
          placeholder={copy.phonePlaceholder}
          value={values.phone}
          error={errors.phone}
          onChange={(event) => updateValue("phone", event.target.value)}
        />

        <div className="mt-1">
          <div className="flex items-start gap-3">
            <Checkbox
              id="accept-terms"
              name="termsAccepted"
              required
              checked={termsAccepted}
              aria-invalid={Boolean(errors.termsAccepted) || undefined}
              aria-describedby={
                errors.termsAccepted ? "accept-terms-error" : undefined
              }
              onCheckedChange={(checked) => {
                setTermsAccepted(checked === true);
                setErrors((current) => ({
                  ...current,
                  termsAccepted: undefined,
                }));
              }}
            />
            <label
              htmlFor="accept-terms"
              className="cursor-pointer type-body-sm text-gray-600"
            >
              {copy.terms}
            </label>
          </div>
          {errors.termsAccepted ? (
            <p
              id="accept-terms-error"
              className="mt-1.5 type-caption text-destructive"
            >
              {errors.termsAccepted}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p role="alert" className="type-caption text-destructive">
            {formError}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="mt-5 w-full"
          loading={pending}
          loadingLabel={copy.submitting}
        >
          {copy.submit}
        </Button>
      </fieldset>
    </form>
  );
}
