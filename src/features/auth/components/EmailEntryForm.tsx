"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import type { Locale } from "next-intl";

import { Button } from "@/components/ui/button";
import { FieldFeedback } from "@/components/ui/field";
import { SaudiMobileField } from "@/components/ui/saudi-mobile-field";
import { normalizeSaudiMobile } from "@/lib/phone/saudi-mobile";
import { requestOtp } from "@/features/auth/actions/request-otp";
import { useRouter } from "@/i18n/navigation";

export type EmailEntryFormCopy = {
  label: string;
  placeholder: string;
  submit: string;
  submitting: string;
  invalidPhone: string;
  unavailable: string;
  rateLimited: string;
};

type EmailEntryFormProps = {
  copy: EmailEntryFormCopy;
  locale: Locale;
  returnTo: string;
};

export function EmailEntryForm({ copy, locale, returnTo }: EmailEntryFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const inFlight = useRef(false);
  const [formErrorKey, setFormError] = useState<keyof Pick<EmailEntryFormCopy, "rateLimited" | "unavailable">>();
  const formError = formErrorKey ? copy[formErrorKey] : undefined;
  const [errorKey, setError] = useState<keyof Pick<EmailEntryFormCopy, "invalidPhone">>();
  const error = errorKey ? copy[errorKey] : undefined;
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const normalizedPhone = normalizeSaudiMobile(phone);
    if (!normalizedPhone) {
      setError("invalidPhone");
      return;
    }

    setError(undefined);
    setFormError(undefined);
    inFlight.current = true;
    startTransition(async () => {
      try {
        const result = await requestOtp({ phone: normalizedPhone }, locale);
        if (!result.ok) {
          if (result.error.code === "invalid-input") {
            setError("invalidPhone");
          } else {
            setFormError(
              result.error.code === "rate-limited" ? "rateLimited" : "unavailable",
            );
          }
          return;
        }

        router.replace({ pathname: "/login/verify", query: { returnTo } });
      } catch {
        setFormError("unavailable");
      } finally {
        inFlight.current = false;
      }
    });
  };

  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
      <fieldset disabled={pending} className="contents">
        <SaudiMobileField
          feedbackMessages={[copy.invalidPhone]}
          id="auth-phone"
          name="phone"
          required
          label={copy.label}
          placeholder={copy.placeholder}
          value={phone}
          error={error}
          onChange={(event) => {
            setPhone(event.target.value);
            setFormError(undefined);
            setError(undefined);
          }}
        />
        <FieldFeedback role="alert" reserve={[copy.unavailable, copy.rateLimited]}>{formError}</FieldFeedback>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={pending}
          loadingLabel={copy.submitting}
        >
          {copy.submit}
        </Button>
      </fieldset>
    </form>
  );
}
