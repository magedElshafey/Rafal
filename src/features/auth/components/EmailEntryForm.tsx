"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import type { Locale } from "next-intl";

import { Button } from "@/components/ui/button";
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
  const [formError, setFormError] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const normalizedPhone = normalizeSaudiMobile(phone);
    if (!normalizedPhone) {
      setError(copy.invalidPhone);
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
            setError(copy.invalidPhone);
          } else {
            setFormError(
              result.error.code === "rate-limited" ? copy.rateLimited : copy.unavailable,
            );
          }
          return;
        }

        router.replace({ pathname: "/login/verify", query: { returnTo } });
      } catch {
        setFormError(copy.unavailable);
      } finally {
        inFlight.current = false;
      }
    });
  };

  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
      <fieldset disabled={pending} className="contents">
        <SaudiMobileField
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
        {formError ? (
          <p role="alert" className="type-caption text-destructive">{formError}</p>
        ) : null}
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
