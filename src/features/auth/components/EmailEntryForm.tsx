"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { Locale } from "next-intl";

import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input";
import { requestOtp } from "@/features/auth/actions/request-otp";
import { useRouter } from "@/i18n/navigation";

export type EmailEntryFormCopy = {
  label: string;
  placeholder: string;
  submit: string;
  submitting: string;
  invalidEmail: string;
  unavailable: string;
};

type EmailEntryFormProps = {
  copy: EmailEntryFormCopy;
  locale: Locale;
  returnTo: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailEntryForm({ copy, locale, returnTo }: EmailEntryFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError(copy.invalidEmail);
      return;
    }

    setError(undefined);
    startTransition(async () => {
      try {
        const result = await requestOtp({ email: normalizedEmail }, locale);
        if (!result.ok) {
          setError(
            result.error.code === "invalid-input"
              ? copy.invalidEmail
              : copy.unavailable,
          );
          return;
        }

        router.replace({ pathname: "/login/verify", query: { returnTo } });
      } catch {
        setError(copy.unavailable);
      }
    });
  };

  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
      <fieldset disabled={pending} className="contents">
        <InputField
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          label={copy.label}
          placeholder={copy.placeholder}
          value={email}
          error={error}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(undefined);
          }}
        />
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
