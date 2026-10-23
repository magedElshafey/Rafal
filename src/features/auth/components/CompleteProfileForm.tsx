"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { Locale } from "next-intl";

import { Button } from "@/components/ui/button";
import { FieldFeedback } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { InputField } from "@/components/ui/input";
import { SaudiMobileField } from "@/components/ui/saudi-mobile-field";
import { completeProfile } from "@/features/auth/actions/complete-profile";
import { usePostAuthCartMerge } from "@/features/auth/hooks/use-post-auth-cart-merge";
import { useRouter } from "@/i18n/navigation";
import { formatSaudiMobileForInput, isValidSaudiMobile } from "@/lib/phone/saudi-mobile";


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
  rateLimited: string;
};

type CompleteProfileFormProps = {
  copy: CompleteProfileFormCopy;
  locale: Locale;
  returnTo: string;
  phone: string;
};

type ProfileValues = { firstName: string; lastName: string; phone: string };
type ProfileErrors = Partial<
  Record<keyof ProfileValues | "termsAccepted", "required" | "invalidPhone" | "termsRequired" | "invalidField">
>;

export function CompleteProfileForm({
  copy,
  locale,
  returnTo,
  phone,
}: CompleteProfileFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileValues>({
    firstName: "",
    lastName: "",
    phone: formatSaudiMobileForInput(phone),
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errorKeys, setErrors] = useState<ProfileErrors>({});
  const errors = {
    firstName: errorKeys.firstName ? copy[errorKeys.firstName] : undefined,
    lastName: errorKeys.lastName ? copy[errorKeys.lastName] : undefined,
    phone: errorKeys.phone ? copy[errorKeys.phone] : undefined,
    termsAccepted: errorKeys.termsAccepted ? copy[errorKeys.termsAccepted] : undefined,
  };
  const [formErrorKey, setFormError] = useState<"invalidField" | "rateLimited" | "unavailable">();
  const formError = formErrorKey ? copy[formErrorKey] : undefined;
  const [pending, startTransition] = useTransition();
  const { mergeAndContinue } = usePostAuthCartMerge(locale, returnTo);

  const updateValue = (field: keyof ProfileValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(undefined);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: ProfileErrors = {};
    if (!values.firstName.trim()) nextErrors.firstName = "required";
    if (!values.lastName.trim()) nextErrors.lastName = "required";
    if (!values.phone.trim()) nextErrors.phone = "required";
    else if (!isValidSaudiMobile(values.phone)) {
      nextErrors.phone = "invalidPhone";
    }
    if (!termsAccepted) nextErrors.termsAccepted = "termsRequired";
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
                  ? "invalidPhone"
                  : field === "termsAccepted"
                    ? "termsRequired"
                    : "invalidField";
            }
            setErrors(backendErrors);
            setFormError(undefined);
            return;
          }
          setFormError(
            result.error.code === "invalid-input"
              ? "invalidField"
              : result.error.code === "rate-limited"
                ? "rateLimited"
                : "unavailable",
          );
          return;
        }
        await mergeAndContinue();
      } catch {
        setFormError("unavailable");
      }
    });
  };

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
      <fieldset disabled={pending} className="contents">
        <InputField
          feedbackMessages={[copy.required, copy.invalidField]}
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
          feedbackMessages={[copy.required, copy.invalidField]}
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
        <SaudiMobileField
          feedbackMessages={[copy.required, copy.invalidField, copy.invalidPhone]}
          id="mobile-number"
          name="phone"
          required
          label={copy.phone}
          placeholder={copy.phonePlaceholder}
          value={values.phone}
          error={errors.phone}
          readOnly
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
          <FieldFeedback
              id="accept-terms-error"
              className="mt-1.5"
             reserve={[copy.termsRequired]}>
              {errors.termsAccepted}
            </FieldFeedback>
        </div>

        <FieldFeedback role="alert" reserve={[copy.invalidField, copy.rateLimited, copy.unavailable]}>
            {formError}
          </FieldFeedback>
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
