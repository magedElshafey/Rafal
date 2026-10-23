"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import type { Locale } from "next-intl";

import { Button } from "@/components/ui/button";
import { FieldFeedback } from "@/components/ui/field";
import { verifyOtp } from "@/features/auth/actions/verify-otp";
import { usePostAuthCartMerge } from "@/features/auth/hooks/use-post-auth-cart-merge";
import { useRouter } from "@/i18n/navigation";

import { OtpInput } from "./OtpInput";

export type OtpVerificationFormCopy = {
  label: string;
  submit: string;
  submitting: string;
  invalidCode: string;
  unavailable: string;
  rateLimited: string;
  sessionFailed: string;
};

type OtpVerificationFormProps = {
  copy: OtpVerificationFormCopy;
  locale: Locale;
  returnTo: string;
};

export function OtpVerificationForm({
  copy,
  locale,
  returnTo,
}: OtpVerificationFormProps) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [code, setCode] = useState("");
  const [errorKey, setError] = useState<keyof Pick<OtpVerificationFormCopy, "invalidCode" | "rateLimited" | "sessionFailed" | "unavailable">>();
  const error = errorKey ? copy[errorKey] : undefined;
  const [pending, startTransition] = useTransition();
  const { mergeAndContinue } = usePostAuthCartMerge(locale, returnTo);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (!/^\d{6}$/.test(code)) {
      setError("invalidCode");
      return;
    }

    setError(undefined);
    inFlight.current = true;
    startTransition(async () => {
      try {
        const result = await verifyOtp({ code }, locale);
        if (!result.ok) {
          if (result.error.code === "pending-phone-missing") {
            router.replace({
              pathname: "/login",
              query: { returnTo, state: "missing-pending-phone" },
            });
            return;
          }
          setError(
            result.error.code === "invalid-input" ||
              result.error.code === "unauthorized"
              ? "invalidCode"
              : result.error.code === "rate-limited"
                ? "rateLimited"
                : result.error.code === "session-failed"
                  ? "sessionFailed"
                  : "unavailable",
          );
          return;
        }

        if (result.profileComplete) {
          await mergeAndContinue();
          return;
        }
        router.replace({ pathname: "/register", query: { returnTo } });
      } catch {
        setError("unavailable");
      } finally {
        inFlight.current = false;
      }
    });
  };

  return (
    <form className="mt-7 flex flex-col" noValidate onSubmit={handleSubmit}>
      <fieldset disabled={pending} className="contents">
        <label htmlFor="auth-otp" className="sr-only">
          {copy.label}
        </label>
        <OtpInput
          id="auth-otp"
          name="code"
          required
          value={code}
          invalid={Boolean(error)}
          aria-describedby={error ? "auth-otp-error" : undefined}
          onValueChange={(value) => {
            setCode(value);
            setError(undefined);
          }}
        />
        <FieldFeedback
            id="auth-otp-error"
            role="alert"
            className="mt-2"
           reserve={[copy.invalidCode, copy.unavailable, copy.rateLimited, copy.sessionFailed]}>
            {error}
          </FieldFeedback>
        <Button
          type="submit"
          size="lg"
          className="mt-10 w-full"
          loading={pending}
          loadingLabel={copy.submitting}
        >
          {copy.submit}
        </Button>
      </fieldset>
    </form>
  );
}
