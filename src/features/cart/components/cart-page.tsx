"use client";

import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import Image from "next/image";
import type { Locale } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { TruckIcon, XIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CartCoupon,
  type CartCouponCopy,
} from "@/features/cart/components/cart-coupon";
import {
  CartGift,
  type CartGiftCopy,
} from "@/features/cart/components/cart-gift";
import { clearCart } from "@/features/cart/actions/clear-cart";
import { removeCartLine } from "@/features/cart/actions/remove-cart-line";
import { updateCartLine } from "@/features/cart/actions/update-cart-line";
import { syncAvailableCartCouponsAfterCartChange } from "@/features/cart/api/cart-coupons-query";
import {
  cartMutationFilters,
  cartMutationKey,
  cartMutationScope,
} from "@/features/cart/api/cart-mutation";
import { setCurrentCartQueryData } from "@/features/cart/api/cart-query";
import { useCurrentCart } from "@/features/cart/hooks/use-current-cart";
import type {
  CartMoney,
  CartMutationError,
  CartSnapshot,
} from "@/features/cart/types/cart.types";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type CartPageCopy = {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  continueShopping: string;
  clear: string;
  clearing: string;
  remove: string;
  removing: string;
  increase: string;
  decrease: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  personalization: string;
  sku: string;
  stock: { ok: string; low: string; outOfStock: string };
  summary: string;
  subtotal: string;
  productDiscount: string;
  personalizationTotal: string;
  giftWrap: string;
  shipping: string;
  couponDiscount: string;
  vatIncluded: string;
  total: string;
  checkout: string;
  freeShippingQualified: string;
  freeShippingRemaining: string;
  coupon: CartCouponCopy;
  gift: CartGiftCopy;
  errors: {
    generic: string;
    validation: string;
    notFound: string;
    retry: string;
  };
};

type CartPageProps = {
  canUseCoupons: boolean;
  copy: CartPageCopy;
  giftWrapEnabled: boolean;
  initialCart: CartSnapshot;
  locale: Locale;
  maxQuantity: number;
};

function formatMoney(locale: Locale, value: CartMoney): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: value.currency,
  }).format(Number(value.amount));
}

function isNonZero(value: CartMoney): boolean {
  return Number(value.amount) !== 0;
}

function errorMessage(
  error: CartMutationError,
  copy: CartPageCopy["errors"],
): string {
  if (
    error.code === "validation-rejected" ||
    error.code === "quantity-limit-exceeded"
  )
    return copy.validation;
  if (error.code === "line-not-found") return copy.notFound;
  return copy.generic;
}

function CartPageSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="size-7 rounded-full" />
      </div>
      <div className="mt-6 rounded-md bg-gold-50 px-5 py-4">
        <Skeleton className="h-5 w-64 max-w-full" />
        <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-0">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 border-b border-gray-200 p-4 last:border-b-0 sm:grid-cols-[6rem_minmax(0,1fr)_10rem] sm:p-5"
              >
                <Skeleton className="aspect-square w-full" />
                <div>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-3 h-4 w-1/2" />
                  <Skeleton className="mt-3 h-4 w-1/3" />
                </div>
                <div className="col-span-2 flex items-end justify-between sm:col-span-1 sm:flex-col">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-11 w-32" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-0 p-4 sm:p-5">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="mt-2 h-4 w-72 max-w-full" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 p-5 sm:p-6">
          <Skeleton className="h-7 w-36" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex justify-between gap-6">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-6 h-px w-full rounded-none" />
          <div className="mt-5 flex justify-between gap-6">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="mt-5 h-13 w-full" />
        </div>
      </div>
    </div>
  );
}

function FreeShippingStatus({
  cart,
  copy,
  locale,
}: {
  cart: CartSnapshot;
  copy: CartPageCopy;
  locale: Locale;
}) {
  const status = cart.summary.freeShipping;
  if (!status.enabled) return null;

  const message = status.qualifies
    ? copy.freeShippingQualified
    : status.remaining
      ? `${copy.freeShippingRemaining}: ${formatMoney(locale, status.remaining)}`
      : null;
  if (!message) return null;

  const threshold = status.threshold ? Number(status.threshold.amount) : null;
  const remaining = status.remaining ? Number(status.remaining.amount) : null;
  const progress = status.qualifies
    ? 100
    : threshold !== null && threshold > 0 && remaining !== null
      ? Math.min(100, Math.max(0, ((threshold - remaining) / threshold) * 100))
      : 0;

  return (
    <section
      aria-label={message}
      className="mt-6 rounded-md bg-gold-50 px-4 py-4 sm:px-5"
    >
      <div className="flex items-center gap-2 text-gold-700">
        <TruckIcon aria-hidden="true" className="size-5 shrink-0" />
        <p className="type-body-sm font-medium">{message}</p>
      </div>
      <div
        aria-hidden="true"
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200"
      >
        <div
          className="h-full rounded-full bg-success transition-[width] motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  );
}

export function CartPage({
  canUseCoupons,
  copy,
  giftWrapEnabled,
  initialCart,
  locale,
  maxQuantity,
}: CartPageProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const cartMutationPending = useIsMutating(cartMutationFilters) > 0;
  const {
    data: cart,
    isError,
    isPending,
    refetch,
  } = useCurrentCart(locale, initialCart);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) =>
      updateCartLine(lineId, quantity, locale),
    retry: false,
    onSuccess: (result) => {
      if (result.ok) {
        setCurrentCartQueryData(queryClient, locale, result.cart);
        void syncAvailableCartCouponsAfterCartChange(
          queryClient,
          locale,
          result.cart,
        );
      } else setMutationError(errorMessage(result.error, copy.errors));
    },
    onError: () => setMutationError(copy.errors.generic),
    onSettled: () => setActiveLineId(null),
  });
  const removeMutation = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: (lineId: string) => removeCartLine(lineId, locale),
    retry: false,
    onSuccess: (result) => {
      if (result.ok) {
        setCurrentCartQueryData(queryClient, locale, result.cart);
        void syncAvailableCartCouponsAfterCartChange(
          queryClient,
          locale,
          result.cart,
        );
      } else setMutationError(errorMessage(result.error, copy.errors));
    },
    onError: () => setMutationError(copy.errors.generic),
    onSettled: () => setActiveLineId(null),
  });
  const clearMutation = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: () => clearCart(locale),
    retry: false,
    onSuccess: (result) => {
      if (result.ok) {
        setCurrentCartQueryData(queryClient, locale, result.cart);
        void syncAvailableCartCouponsAfterCartChange(
          queryClient,
          locale,
          result.cart,
        );
      } else setMutationError(errorMessage(result.error, copy.errors));
    },
    onError: () => setMutationError(copy.errors.generic),
  });

  const busy = cartMutationPending;
  const mutateQuantity = (lineId: string, quantity: number) => {
    if (busy || quantity < 1 || quantity > maxQuantity) return;
    setMutationError(null);
    setActiveLineId(lineId);
    updateMutation.mutate({ lineId, quantity });
  };

  if (isError && !cart) {
    return (
      <section
        role="alert"
        className="rounded-lg border border-destructive/20 bg-destructive/5 px-5 py-10 text-center"
      >
        <h1 className="text-h2 font-bold text-gray-1000">{copy.title}</h1>
        <p className="mx-auto mt-3 max-w-xl type-body text-destructive">
          {copy.errors.generic}
        </p>
        <Button className="mt-6" onClick={() => void refetch()}>
          {copy.errors.retry}
        </Button>
      </section>
    );
  }

  if (isPending || !cart) return <CartPageSkeleton label={copy.title} />;

  const cartTitle = `${copy.title} (${new Intl.NumberFormat(locale).format(cart.summary.totalQuantity)})`;

  if (cart.lines.length === 0) {
    return (
      <div>
        <h1 className="text-h2 font-bold text-gray-1000">{cartTitle}</h1>
        <section className="mt-6 rounded-lg border border-gray-200 bg-gray-0 px-5 py-14 text-center sm:px-8 sm:py-20">
          <h2 className="text-h2 font-bold text-gray-1000">
            {copy.emptyTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-xl type-body text-gray-500">
            {copy.emptyDescription}
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-gray-1000 px-5 type-body font-medium text-gray-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {copy.continueShopping}
          </Link>
        </section>
      </div>
    );
  }

  const linesSection = (
    <section
      aria-label={copy.title}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="min-w-0"
    >
      <div className="mb-4 flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          loading={clearMutation.isPending}
          loadingLabel={copy.clearing}
          disabled={busy}
          onClick={() => {
            setMutationError(null);
            clearMutation.mutate();
          }}
        >
          {copy.clear}
        </Button>
      </div>

      {mutationError ? (
        <p
          role="alert"
          className="mb-4 rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 type-body-sm text-destructive"
        >
          {mutationError}
        </p>
      ) : null}

      <ul className="overflow-hidden rounded-lg border border-gray-200 bg-gray-0 divide-y divide-gray-200">
        {cart.lines.map((line) => {
          const lineBusy = activeLineId === line.id;
          const attributes = Object.entries(line.variant.attributes);
          return (
            <li key={line.id} className="p-4 sm:p-5">
              <article
                className={cn(
                  "grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 sm:grid-cols-[6rem_minmax(0,1fr)_10rem]",
                  lineBusy && "opacity-70",
                )}
                aria-busy={lineBusy || undefined}
              >
                <Link
                  href={`/products/${line.product.slug}`}
                  className="block aspect-square w-full self-start overflow-hidden rounded-md bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {line.product.image ? (
                    <Image
                      src={line.product.image.src}
                      alt={line.product.name}
                      width={128}
                      height={128}
                      sizes="(min-width: 640px) 96px, 88px"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="block size-full bg-gray-100"
                    />
                  )}
                </Link>

                <div className="min-w-0">
                  <Link
                    href={`/products/${line.product.slug}`}
                    className="text-h4 font-medium text-gray-1000 hover:text-gold-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {line.product.name}
                  </Link>
                  <p className="mt-1 type-caption text-gray-400">
                    {copy.sku}: <bdi>{line.variant.sku}</bdi>
                  </p>

                  {attributes.length > 0 ? (
                    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 type-body-sm text-gray-500">
                      {attributes.map(([name, value]) => (
                        <div key={name} className="flex gap-1">
                          <dt>{name}:</dt>
                          <dd>{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {line.personalization?.text ? (
                    <p className="mt-2 type-body-sm text-gold-700">
                      {copy.personalization}:{" "}
                      <bdi>{line.personalization.text}</bdi>
                    </p>
                  ) : null}
                  <p
                    className={cn(
                      "mt-2 type-caption",
                      line.stock.status === "out_of_stock"
                        ? "text-destructive"
                        : line.stock.status === "low"
                          ? "text-gold-700"
                          : "text-success",
                    )}
                  >
                    {
                      copy.stock[
                        line.stock.status === "out_of_stock"
                          ? "outOfStock"
                          : line.stock.status
                      ]
                    }
                  </p>
                </div>

                <div className="col-span-2 flex min-w-0 items-end justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end">
                  <div className="flex items-start gap-2 sm:w-full sm:justify-between">
                    <div className="text-start sm:text-end">
                      <strong className="block type-body-lg text-gray-1000">
                        <span className="sr-only">{copy.lineTotal}: </span>
                        <bdi>{formatMoney(locale, line.lineTotal)}</bdi>
                      </strong>
                      <span className="mt-1 block type-caption text-gray-400">
                        {copy.unitPrice}:{" "}
                        {line.discountActive ? (
                          <del className="me-1">
                            <bdi>
                              {formatMoney(locale, line.unitRegularPrice)}
                            </bdi>
                          </del>
                        ) : null}
                        <bdi>{formatMoney(locale, line.unitPrice)}</bdi>
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={`${copy.remove}: ${line.product.name}`}
                      disabled={busy}
                      onClick={() => {
                        setMutationError(null);
                        setActiveLineId(line.id);
                        removeMutation.mutate(line.id);
                      }}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>

                  <div className="flex h-11 items-center overflow-hidden rounded-md border border-gray-200 bg-gray-0">
                    <button
                      type="button"
                      aria-label={copy.decrease}
                      disabled={busy || line.quantity <= 1}
                      onClick={() => mutateQuantity(line.id, line.quantity - 1)}
                      className="size-11 text-lg hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:text-gray-300"
                    >
                      {"\u2212"}
                    </button>
                    <output
                      aria-label={copy.quantity}
                      aria-live="polite"
                      className="min-w-8 text-center type-body font-medium"
                    >
                      {line.quantity}
                    </output>
                    <button
                      type="button"
                      aria-label={copy.increase}
                      disabled={busy || line.quantity >= maxQuantity}
                      onClick={() => mutateQuantity(line.id, line.quantity + 1)}
                      className="size-11 text-lg hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:text-gray-300"
                    >
                      +
                    </button>
                  </div>
                </div>

                <p
                  aria-live="polite"
                  className="col-span-2 min-h-4 type-caption text-gray-500 sm:col-start-3 sm:text-end"
                >
                  {lineBusy
                    ? removeMutation.isPending
                      ? copy.removing
                      : copy.quantity
                    : ""}
                </p>
              </article>
            </li>
          );
        })}
      </ul>
      <CartGift
        copy={copy.gift}
        gift={cart.gift}
        giftWrapEnabled={giftWrapEnabled}
        locale={locale}
      />
    </section>
  );

  const summarySection = (
    <aside
      aria-labelledby="cart-summary-title"
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="rounded-lg bg-gray-50 p-5 sm:p-6 lg:sticky lg:top-4"
    >
      <h2 id="cart-summary-title" className="text-h3 font-bold text-gray-1000">
        {copy.summary}
      </h2>
      {canUseCoupons ? (
        <CartCoupon
          coupon={cart.coupon}
          copy={copy.coupon}
          currency={cart.summary.total.currency}
          locale={locale}
        />
      ) : null}
      <dl className="mt-6 space-y-4 type-body text-gray-600">
        <SummaryRow
          label={copy.subtotal}
          value={formatMoney(locale, cart.summary.subtotal)}
        />
        {isNonZero(cart.summary.productDiscountTotal) ? (
          <SummaryRow
            label={copy.productDiscount}
            value={`\u2212${formatMoney(locale, cart.summary.productDiscountTotal)}`}
            discount
          />
        ) : null}
        {isNonZero(cart.summary.personalizationTotal) ? (
          <SummaryRow
            label={copy.personalizationTotal}
            value={formatMoney(locale, cart.summary.personalizationTotal)}
          />
        ) : null}
        {isNonZero(cart.summary.giftWrapFee) ? (
          <SummaryRow
            label={copy.giftWrap}
            value={formatMoney(locale, cart.summary.giftWrapFee)}
          />
        ) : null}
        {cart.summary.shippingFee ? (
          <SummaryRow
            label={copy.shipping}
            value={formatMoney(locale, cart.summary.shippingFee)}
          />
        ) : null}
        {isNonZero(cart.summary.couponDiscount) ? (
          <SummaryRow
            label={copy.couponDiscount}
            value={`\u2212${formatMoney(locale, cart.summary.couponDiscount)}`}
            discount
          />
        ) : null}
        <SummaryRow
          label={copy.vatIncluded}
          value={formatMoney(locale, cart.summary.vat.includedAmount)}
        />
      </dl>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-gray-200 pt-5">
        <span className="type-body-lg font-medium text-gray-700">
          {copy.total}
        </span>
        <strong className="text-h3 text-gray-1000">
          <bdi>{formatMoney(locale, cart.summary.total)}</bdi>
        </strong>
      </div>
      <Button
        size="lg"
        className="mt-5 w-full"
        onClick={() => router.push("/checkout")}
      >
        {copy.checkout}
      </Button>
    </aside>
  );

  return (
    <div>
      <h1 className="text-h2 font-bold text-gray-1000">{cartTitle}</h1>
      <FreeShippingStatus cart={cart} copy={copy} locale={locale} />
      <div
        dir="ltr"
        className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
      >
        {linesSection}
        {summarySection}
      </div>
    </div>
  );
}

function SummaryRow({
  discount = false,
  label,
  value,
}: {
  discount?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt>{label}</dt>
      <dd className={discount ? "text-destructive" : "text-gray-1000"}>
        <bdi>{value}</bdi>
      </dd>
    </div>
  );
}
