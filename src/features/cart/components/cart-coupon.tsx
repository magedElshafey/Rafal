"use client";

import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { type FormEvent, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  applyCartCoupon,
  removeCartCoupon,
} from "@/features/cart/actions/cart-coupons";
import {
  availableCartCouponsQueryOptions,
  CartCouponQueryError,
  syncAvailableCartCouponsAfterCartChange,
} from "@/features/cart/api/cart-coupons-query";
import {
  cartMutationFilters,
  cartMutationKey,
  cartMutationScope,
} from "@/features/cart/api/cart-mutation";
import { setCurrentCartQueryData } from "@/features/cart/api/cart-query";
import type {
  CartCouponError,
  CartSnapshot,
} from "@/features/cart/types/cart.types";
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
  loading: string;
  empty: string;
  retry: string;
  invalid: string;
  serviceError: string;
  sessionExpired: string;
  applied: string;
  estimatedDiscount: string;
  minimumOrder: string;
};

type CartCouponProps = {
  coupon: CartSnapshot["coupon"];
  copy: CartCouponCopy;
  currency: string;
  locale: Locale;
};

function formatCouponAmount(locale: Locale, amount: string | number, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(Number(amount));
}

function couponErrorMessage(error: CartCouponError, copy: CartCouponCopy) {
  if (error.code === "invalid-input" || error.code === "rejected") {
    return copy.invalid;
  }
  return error.code === "unauthorized"
    ? copy.sessionExpired
    : copy.serviceError;
}

export function CartCoupon({ coupon, copy, currency, locale }: CartCouponProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const cartMutationPending = useIsMutating(cartMutationFilters) > 0;
  const inputId = useId();
  const errorId = useId();
  const availableId = useId();
  const [code, setCode] = useState("");
  const [availableOpen, setAvailableOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCoupons = useQuery({
    ...availableCartCouponsQueryOptions(locale),
    enabled: availableOpen,
  });
  const availableError =
    availableCoupons.error instanceof CartCouponQueryError
      ? availableCoupons.error
      : null;

  useEffect(() => {
    if (availableError?.code === "unauthorized") router.refresh();
  }, [availableError, router]);

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
        void syncAvailableCartCouponsAfterCartChange(
          queryClient,
          locale,
          result.cart,
        );
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
        void syncAvailableCartCouponsAfterCartChange(
          queryClient,
          locale,
          result.cart,
        );
        setError(null);
        return;
      }
      handleMutationError(result.error);
    },
    onError: () => setError(copy.serviceError),
  });

  const busy = cartMutationPending;
  const applyCode = (couponCode: string) => {
    if (busy) return;
    const normalizedCode = couponCode.trim();
    if (!normalizedCode) {
      setError(copy.invalid);
      return;
    }
    setError(null);
    applyMutation.mutate(normalizedCode);
  };
  const submitCoupon = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyCode(code);
  };

  return (
    <section className="mt-5 border-b border-gray-200 pb-5">
      {coupon?.applied ? (
        <div className="rounded-md border border-success/30 bg-gray-0 p-4">
          <p className="type-caption font-medium text-success">{copy.applied}</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate type-body font-medium text-gray-1000">
                {coupon.name || coupon.code}
              </p>
              <p className="type-caption text-gray-500">
                <bdi>{coupon.code}</bdi>
              </p>
            </div>
            <Button
              type="button"
              aria-label={`${copy.removeAction} ${coupon.code}`}
              variant="outline"
              size="sm"
              loading={removeMutation.isPending}
              loadingLabel={copy.removing}
              disabled={busy}
              onClick={() => {
                setError(null);
                removeMutation.mutate();
              }}
            >
              {copy.remove}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="type-body font-medium text-gray-1000">{copy.label}</p>
          <label
            htmlFor={inputId}
            className="mt-3 block type-caption text-gray-600"
          >
            {copy.codeLabel}
          </label>
          <form className="mt-2 flex items-start gap-2" onSubmit={submitCoupon}>
            <div className="min-w-0 flex-1">
              <Input
                id={inputId}
                name="couponCode"
                value={code}
                autoComplete="off"
                placeholder={copy.codePlaceholder}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                disabled={busy}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <Button
              type="submit"
              aria-label={
                code.trim()
                  ? `${copy.applyAction} ${code.trim()}`
                  : copy.applyAction
              }
              variant="outline"
              loading={applyMutation.isPending}
              loadingLabel={copy.applying}
              disabled={busy}
            >
              {copy.apply}
            </Button>
          </form>

          <button
            type="button"
            aria-expanded={availableOpen}
            aria-controls={availableId}
            className="mt-3 min-h-11 rounded-sm type-body-sm font-medium text-gold-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => setAvailableOpen((open) => !open)}
          >
            {copy.available}
          </button>

          {availableOpen ? (
            <div id={availableId} className="mt-2 space-y-2">
              {availableCoupons.isPending ? (
                <div
                  aria-busy="true"
                  aria-label={copy.loading}
                  className="space-y-2"
                >
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : availableCoupons.isError ? (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                  <p className="type-caption text-destructive">
                    {availableError
                      ? couponErrorMessage(availableError, copy)
                      : copy.serviceError}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1"
                    onClick={() => void availableCoupons.refetch()}
                  >
                    {copy.retry}
                  </Button>
                </div>
              ) : availableCoupons.data.length === 0 ? (
                <p className="rounded-md bg-gray-0 p-3 type-caption text-gray-500">
                  {copy.empty}
                </p>
              ) : (
                <ul className="space-y-2">
                  {availableCoupons.data.map((availableCoupon) => (
                    <li
                      key={availableCoupon.code}
                      className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-0 p-3"
                    >
                      <div className="min-w-0">
                        <p className="type-body-sm font-medium text-gray-1000">
                          {availableCoupon.name}
                        </p>
                        <p className="type-caption text-gray-500">
                          <bdi>{availableCoupon.code}</bdi>
                        </p>
                        {availableCoupon.description ? (
                          <p className="mt-1 type-caption text-gray-500">
                            {availableCoupon.description}
                          </p>
                        ) : null}
                        <p className="mt-1 type-caption text-gray-500">
                          {copy.estimatedDiscount}:{" "}
                          <bdi>
                            {formatCouponAmount(
                              locale,
                              availableCoupon.estimatedDiscount,
                              currency,
                            )}
                          </bdi>
                          {availableCoupon.minOrderAmount !== null ? (
                            <>
                              {" · "}
                              {copy.minimumOrder}:{" "}
                              <bdi>
                                {formatCouponAmount(
                                  locale,
                                  availableCoupon.minOrderAmount,
                                  currency,
                                )}
                              </bdi>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <Button
                        type="button"
                        aria-label={`${copy.applyAction} ${availableCoupon.code}`}
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        loading={
                          applyMutation.isPending &&
                          code.trim() === availableCoupon.code
                        }
                        loadingLabel={copy.applying}
                        onClick={() => {
                          setCode(availableCoupon.code);
                          applyCode(availableCoupon.code);
                        }}
                      >
                        {copy.apply}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </>
      )}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-3 type-caption text-destructive"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
