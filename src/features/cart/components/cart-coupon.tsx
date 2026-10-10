"use client";

import { CircleNotchIcon } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { type FormEvent, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ChevronDownIcon, PlusIcon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import {
  applyCartCoupon,
  removeCartCoupon,
} from "@/features/cart/actions/cart-coupons";
import {
  cartMutationKey,
  cartMutationScope,
} from "@/features/cart/api/cart-mutation";
import { setCurrentCartQueryData } from "@/features/cart/api/cart-query";
import type {
  CartCouponError,
  CartSnapshot,
} from "@/features/cart/types/cart.types";
import type { Coupon } from "@/features/offers/types/offers.types";
import { couponTimestampToDate } from "@/features/offers/utils/coupon-date";
import { useRouter } from "@/i18n/navigation";

export type CartCouponCopy = {
  label: string;
  codeLabel: string;
  codePlaceholder: string;
  apply: string;
  applyAction: string;
  applying: string;
  remove: string;
  removeAction: string;
  removing: string;
  available: string;
  invalid: string;
  serviceError: string;
  discoveryError: string;
  sessionExpired: string;
  applied: string;
  minimumOrder: string;
  maximumDiscount: string;
  expires: string;
};

type CartCouponProps = {
  availableCoupons: readonly Coupon[];
  cityTransitionLocked: boolean;
  coupon: CartSnapshot["coupon"];
  copy: CartCouponCopy;
  currency: string;
  discoveryFailed: boolean;
  locale: Locale;
};

function couponErrorMessage(error: CartCouponError, copy: CartCouponCopy) {
  if (error.code === "invalid-input" || error.code === "rejected")
    return copy.invalid;
  return error.code === "unauthorized"
    ? copy.sessionExpired
    : copy.serviceError;
}

type CouponBadge =
  | { kind: "percent"; value: string }
  | { kind: "fixed"; amount: string; currency: string };

function couponBadge(
  coupon: Coupon,
  moneyFormatter: Intl.NumberFormat,
  percentFormatter: Intl.NumberFormat,
): CouponBadge {
  if (coupon.type === "percent") {
    return {
      kind: "percent",
      value: percentFormatter.format(coupon.value / 100),
    };
  }
  const parts = moneyFormatter.formatToParts(coupon.value);
  return {
    kind: "fixed",
    amount: parts
      .filter((part) => part.type !== "currency" && part.type !== "literal")
      .map((part) => part.value)
      .join(""),
    currency: parts
      .filter((part) => part.type === "currency")
      .map((part) => part.value)
      .join(""),
  };
}

function couponFormatters(locale: Locale, currency: string) {
  return {
    money: new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }),
    badgeMoney: new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }),
    percent: new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 2,
    }),
  };
}

export function CartCoupon({
  availableCoupons,
  cityTransitionLocked,
  coupon,
  copy,
  currency,
  discoveryFailed,
  locale,
}: CartCouponProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const availableId = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleMutationError = (couponError: CartCouponError) => {
    setError(couponErrorMessage(couponError, copy));
    if (couponError.code === "unauthorized") router.refresh();
  };

  const applyMutation = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: (couponCode: string) => applyCartCoupon(couponCode, locale),
    retry: false,
    onSuccess: (result) => {
      if (result.ok) {
        setCurrentCartQueryData(queryClient, locale, result.cart);
        setCode("");
        setError(null);
        return;
      }
      handleMutationError(result.error);
    },
    onError: () => setError(copy.serviceError),
  });

  const removeMutation = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: () => removeCartCoupon(locale),
    retry: false,
    onSuccess: (result) => {
      if (result.ok) {
        setCurrentCartQueryData(queryClient, locale, result.cart);
        setError(null);
        return;
      }
      handleMutationError(result.error);
    },
    onError: () => setError(copy.serviceError),
  });

  const busy = applyMutation.isPending || removeMutation.isPending;
  const writeDisabled = busy || cityTransitionLocked;
  const applyCode = (couponCode: string) => {
    if (writeDisabled) return;
    const normalizedCode = couponCode.trim();
    if (!normalizedCode) {
      setError(copy.invalid);
      return;
    }
    if (coupon?.applied && normalizedCode === coupon.code) return;
    setError(null);
    applyMutation.mutate(normalizedCode);
  };
  const submitCoupon = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyCode(code);
  };
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeZone: "UTC",
      }),
    [locale],
  );
  const formatters = useMemo(
    () => couponFormatters(locale, currency),
    [currency, locale],
  );
  const countFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const availableCouponOptions = availableCoupons.filter(
    (availableCoupon) =>
      !(coupon?.applied && coupon.code === availableCoupon.code),
  );

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      className="mt-5 border-b border-gray-200 pb-5"
    >
      <h3
        id={`${inputId}-title`}
        className="type-body font-medium text-gray-1000"
      >
        {copy.label}
      </h3>
      <form className="mt-3 flex items-start gap-2" onSubmit={submitCoupon}>
        <label htmlFor={inputId} className="sr-only">
          {copy.codeLabel}
        </label>
        <Input
          id={inputId}
          name="couponCode"
          value={code}
          autoComplete="off"
          placeholder={copy.codePlaceholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={writeDisabled}
          onChange={(event) => setCode(event.target.value)}
          className="min-w-0 flex-1 bg-gray-0"
        />
        <Button
          type="submit"
          aria-label={
            code.trim()
              ? `${copy.applyAction} ${code.trim()}`
              : copy.applyAction
          }
          variant="outline"
          loading={
            applyMutation.isPending && applyMutation.variables === code.trim()
          }
          loadingLabel={copy.applying}
          disabled={
            writeDisabled ||
            (coupon?.applied === true && code.trim() === coupon.code)
          }
          className="px-4"
        >
          {copy.apply}
        </Button>
      </form>

      {coupon?.applied ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-success/30 bg-gray-0 p-3">
          <div className="min-w-0">
            <p className="type-caption font-medium text-success">
              {copy.applied}
            </p>
            <p className="break-words type-body-sm font-medium text-gray-1000 [overflow-wrap:anywhere]">
              {coupon.name || coupon.code}
            </p>
            <p className="break-all type-caption text-gray-500">
              <bdi>{coupon.code}</bdi>
            </p>
          </div>
          <Button
            type="button"
            aria-label={`${copy.removeAction} ${coupon.code}`}
            variant="ghost"
            size="sm"
            loading={removeMutation.isPending}
            loadingLabel={copy.removing}
            disabled={writeDisabled}
            onClick={() => {
              if (cityTransitionLocked) return;
              setError(null);
              removeMutation.mutate();
            }}
          >
            {copy.remove}
          </Button>
        </div>
      ) : null}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 type-caption text-destructive"
        >
          {error}
        </p>
      ) : null}

      {discoveryFailed ? (
        <p className="mt-4 type-caption text-gray-500">{copy.discoveryError}</p>
      ) : availableCouponOptions.length > 0 ? (
        <details className="group mt-4">
          <summary
            aria-controls={availableId}
            className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-sm type-body-sm font-medium text-gray-1000 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
          >
            <span>
              {copy.available} ({countFormatter.format(
                availableCouponOptions.length,
              )})
            </span>
            <ChevronDownIcon
              aria-hidden="true"
              className="size-4 shrink-0 group-open:rotate-180"
            />
          </summary>
          <div id={availableId}>
            <ul className="mt-2 space-y-2">
              {availableCouponOptions.map((availableCoupon) => {
                const expiry = availableCoupon.endsAt
                  ? couponTimestampToDate(availableCoupon.endsAt)
                  : null;
                const applying =
                  applyMutation.isPending &&
                  applyMutation.variables === availableCoupon.code;
                const badge = couponBadge(
                  availableCoupon,
                  formatters.badgeMoney,
                  formatters.percent,
                );
                return (
                  <li
                    key={availableCoupon.code}
                    className="flex min-w-0 items-center gap-3 rounded-md border border-gold-400 bg-gray-0 p-3"
                  >
                  <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-full border border-gold-400 bg-gold-50 px-1 text-center font-bold leading-none text-gold-700 tabular-nums">
                    {badge.kind === "percent" ? (
                      <bdi className="type-body-sm">{badge.value}</bdi>
                    ) : (
                      <>
                        <bdi className="type-body-sm">{badge.amount}</bdi>
                        <bdi className="mt-1 type-caption font-medium">
                          {badge.currency}
                        </bdi>
                      </>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words type-body-sm font-medium text-gray-1000 [overflow-wrap:anywhere]">
                      {availableCoupon.name}
                    </p>
                    {availableCoupon.description ? (
                      <p className="mt-0.5 break-words type-caption text-gray-500 [overflow-wrap:anywhere]">
                        {availableCoupon.description}
                      </p>
                    ) : null}
                    {availableCoupon.minOrderAmount !== null ||
                    (availableCoupon.type === "percent" &&
                      availableCoupon.maxDiscountAmount !== null) ||
                    expiry ? (
                      <dl className="mt-1 space-y-0.5 type-caption text-gray-500">
                        {availableCoupon.minOrderAmount !== null ? (
                          <div className="flex flex-wrap gap-x-1">
                            <dt>{copy.minimumOrder}:</dt>
                            <dd>
                              <bdi>
                                {formatters.money.format(
                                  availableCoupon.minOrderAmount,
                                )}
                              </bdi>
                            </dd>
                          </div>
                        ) : null}
                        {availableCoupon.type === "percent" &&
                        availableCoupon.maxDiscountAmount !== null ? (
                          <div className="flex flex-wrap gap-x-1">
                            <dt>{copy.maximumDiscount}:</dt>
                            <dd>
                              <bdi>
                                {formatters.money.format(
                                  availableCoupon.maxDiscountAmount,
                                )}
                              </bdi>
                            </dd>
                          </div>
                        ) : null}
                        {expiry ? (
                          <div className="flex flex-wrap gap-x-1">
                            <dt>{copy.expires}:</dt>
                            <dd>
                              <time dateTime={expiry.toISOString()}>
                                {dateFormatter.format(expiry)}
                              </time>
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : null}
                  </div>
                  <IconButton
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`${copy.applyAction}: ${
                      availableCoupon.name || availableCoupon.code
                    }`}
                    disabled={writeDisabled}
                    className="self-center border-gold-500 text-gold-700"
                    onClick={() => applyCode(availableCoupon.code)}
                  >
                    {applying ? (
                      <CircleNotchIcon
                        aria-hidden="true"
                        className="animate-spin motion-reduce:animate-none"
                      />
                    ) : (
                      <PlusIcon aria-hidden="true" />
                    )}
                  </IconButton>
                  </li>
                );
              })}
            </ul>
          </div>
        </details>
      ) : null}
    </section>
  );
}
