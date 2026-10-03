"use client";

import type { Locale } from "next-intl";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { InfoIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { OtpInput } from "@/features/auth/components/OtpInput";
import { useCheckoutVerify } from "@/features/checkout/hooks/use-checkout-verify";
import type { CheckoutVerifyRequest } from "@/features/checkout/types/checkout.types";
import {
  clearCheckoutVerificationHandoff,
  readCheckoutVerificationHandoff,
  storeCheckoutConfirmationHandoff,
  type CheckoutVerificationHandoff as VerificationContext,
} from "@/features/checkout/utils/checkout-handoff";
import { Link, useRouter } from "@/i18n/navigation";

const OTP_PATTERN = /^\d{6}$/;

export type CheckoutVerificationCopy = {
  title: string;
  description: string;
  sentTo: string;
  orderNumber: string;
  otpLabel: string;
  otpHint: string;
  required: string;
  incomplete: string;
  expiresIn: string;
  expired: string;
  verify: string;
  verifying: string;
  verificationFailed: string;
  missingTitle: string;
  missingDescription: string;
  returnToCheckout: string;
};

type VerifyOrder = (input: CheckoutVerifyRequest) => void | Promise<void>;

function expiryTime(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatRemainingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function CheckoutOrderVerificationForm({
  context,
  copy,
  error,
  pending,
  onInput,
  onVerify,
}: {
  context: VerificationContext;
  copy: CheckoutVerificationCopy;
  error: string | null;
  pending: boolean;
  onInput: () => void;
  onVerify: VerifyOrder;
}) {
  const expiresAt = expiryTime(context.verificationExpiresAt);
  const [now, setNow] = useState(() => Date.now());
  const [otp, setOtp] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (expiresAt === null) return;
    if (Date.now() >= expiresAt) return;

    const interval = window.setInterval(() => {
      const nextTime = Date.now();
      setNow(nextTime);
      if (nextTime >= expiresAt) window.clearInterval(interval);
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [expiresAt]);

  const remainingSeconds =
    expiresAt === null
      ? null
      : Math.max(0, Math.ceil((expiresAt - now) / 1_000));
  const expired = remainingSeconds === 0;
  const validOtp = OTP_PATTERN.test(otp);
  const validationMessage = touched
    ? otp.length === 0
      ? copy.required
      : !validOtp
        ? copy.incomplete
        : null
    : null;
  const locallyEligible = validOtp && !expired;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (!locallyEligible || pending) return;
    void onVerify({
      orderNumber: context.orderNumber,
      email: context.email,
      otp,
    });
  };

  return (
    <>
      <dl className="mt-6 space-y-3 border-t border-gray-200 pt-5 type-body">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-gray-500">{copy.orderNumber}</dt>
          <dd className="font-medium text-gray-1000">
            <bdi dir="ltr">{context.displayNumber}</bdi>
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-gray-500">{copy.sentTo}</dt>
          <dd className="min-w-0 break-all font-medium text-gray-1000">
            <bdi dir="ltr">{context.email}</bdi>
          </dd>
        </div>
      </dl>

      <form className="mt-7 text-start" noValidate onSubmit={submit}>
        <label htmlFor="checkout-order-otp" className="type-label text-gray-600">
          {copy.otpLabel}
        </label>
        <p id="checkout-order-otp-hint" className="mt-1 type-caption text-gray-600">
          {copy.otpHint}
        </p>
        <OtpInput
          id="checkout-order-otp"
          name="otp"
          className="mt-3"
          required
          value={otp}
          disabled={pending}
          invalid={validationMessage !== null}
          aria-describedby={
            validationMessage
              ? "checkout-order-otp-hint checkout-order-otp-error"
              : error
                ? "checkout-order-otp-hint checkout-order-verification-error"
                : "checkout-order-otp-hint"
          }
          onBlur={() => setTouched(true)}
          onValueChange={(value) => {
            setOtp(value);
            onInput();
          }}
        />
        {validationMessage ? (
          <p
            id="checkout-order-otp-error"
            role="alert"
            className="mt-2 type-caption text-destructive"
          >
            {validationMessage}
          </p>
        ) : null}

        {remainingSeconds !== null ? (
          expired ? (
            <p role="status" className="mt-4 type-body-sm font-medium text-destructive">
              {copy.expired}
            </p>
          ) : (
            <p className="mt-4 type-body-sm text-gray-600">
              {copy.expiresIn}{" "}
              <bdi dir="ltr">{formatRemainingTime(remainingSeconds)}</bdi>
            </p>
          )
        ) : null}

        {error ? (
          <p
            id="checkout-order-verification-error"
            role="alert"
            className="mt-4 type-body-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="mt-6 w-full"
          disabled={!locallyEligible || pending}
          loading={pending}
          loadingLabel={copy.verifying}
        >
          {copy.verify}
        </Button>
      </form>
    </>
  );
}

export function CheckoutVerificationHandoff({
  copy,
  locale,
  orderNumber,
}: {
  copy: CheckoutVerificationCopy;
  locale: Locale;
  orderNumber: string;
}) {
  const router = useRouter();
  const verifyMutation = useCheckoutVerify(locale);
  const verifyInFlightRef = useRef(false);
  const [context, setContext] = useState<
    VerificationContext | null | undefined
  >(undefined);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setContext(readCheckoutVerificationHandoff(orderNumber));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [orderNumber]);

  const verifyOrder: VerifyOrder = async (input) => {
    if (verifyInFlightRef.current) return;
    verifyInFlightRef.current = true;
    setRequestError(null);
    verifyMutation.reset();

    try {
      const result = await verifyMutation.mutateAsync(input);
      storeCheckoutConfirmationHandoff(result);
      clearCheckoutVerificationHandoff(orderNumber);
      router.replace(
        `/orders/${encodeURIComponent(result.orderNumber)}/confirmation`,
      );
    } catch {
      setRequestError(copy.verificationFailed);
    } finally {
      verifyInFlightRef.current = false;
    }
  };

  if (context === undefined) {
    return <Skeleton className="mx-auto h-96 max-w-xl rounded-xl" />;
  }

  return (
    <section className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-gray-0 p-6 text-center sm:p-10">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gold-50 text-gold-700">
        <InfoIcon aria-hidden="true" className="size-8" />
      </div>
      <h1 className="mt-5 text-h2 font-bold text-gray-1000">
        {context ? copy.title : copy.missingTitle}
      </h1>
      <p className="mx-auto mt-3 max-w-md type-body text-gray-600">
        {context ? copy.description : copy.missingDescription}
      </p>
      {context ? (
        <CheckoutOrderVerificationForm
          context={context}
          copy={copy}
          error={requestError}
          pending={verifyMutation.isPending}
          onInput={() => setRequestError(null)}
          onVerify={verifyOrder}
        />
      ) : (
        <Link
          href="/checkout"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-gray-1000 px-5 type-body font-medium text-gray-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {copy.returnToCheckout}
        </Link>
      )}
    </section>
  );
}
