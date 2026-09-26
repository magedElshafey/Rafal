"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import type { Locale } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/ui/icons";
import { clearCart } from "@/features/cart/actions/clear-cart";
import { removeCartLine } from "@/features/cart/actions/remove-cart-line";
import { updateCartLine } from "@/features/cart/actions/update-cart-line";
import { setCurrentCartQueryData } from "@/features/cart/api/cart-query";
import { useCurrentCart } from "@/features/cart/hooks/use-current-cart";
import type {
  CartMoney,
  CartMutationError,
  CartSnapshot,
} from "@/features/cart/types/cart.types";
import { Link, useRouter } from "@/i18n/navigation";

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
  couponGuestTitle: string;
  couponGuestDescription: string;
  login: string;
  errors: { generic: string; validation: string; notFound: string };
};

type CartPageProps = {
  copy: CartPageCopy;
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

export function CartPage({
  copy,
  initialCart,
  locale,
  maxQuantity,
}: CartPageProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const {
    data: cart,
    isError,
    isPending,
  } = useCurrentCart(locale, initialCart);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) =>
      updateCartLine(lineId, quantity, locale),
    retry: false,
    onSuccess: (result) => {
      if (result.ok) setCurrentCartQueryData(queryClient, locale, result.cart);
      else setMutationError(errorMessage(result.error, copy.errors));
    },
    onError: () => setMutationError(copy.errors.generic),
    onSettled: () => setActiveLineId(null),
  });
  const removeMutation = useMutation({
    mutationFn: (lineId: string) => removeCartLine(lineId, locale),
    retry: false,
    onSuccess: (result) => {
      if (result.ok) setCurrentCartQueryData(queryClient, locale, result.cart);
      else setMutationError(errorMessage(result.error, copy.errors));
    },
    onError: () => setMutationError(copy.errors.generic),
    onSettled: () => setActiveLineId(null),
  });
  const clearMutation = useMutation({
    mutationFn: () => clearCart(locale),
    retry: false,
    onSuccess: (result) => {
      if (result.ok) setCurrentCartQueryData(queryClient, locale, result.cart);
      else setMutationError(errorMessage(result.error, copy.errors));
    },
    onError: () => setMutationError(copy.errors.generic),
  });

  const busy = activeLineId !== null || clearMutation.isPending;
  const mutateQuantity = (lineId: string, quantity: number) => {
    if (busy || quantity < 1 || quantity > maxQuantity) return;
    setMutationError(null);
    setActiveLineId(lineId);
    updateMutation.mutate({ lineId, quantity });
  };

  if (isError && !cart) {
    return (
      <p
        role="alert"
        className="rounded-md border border-destructive/20 bg-destructive/5 p-4 type-body text-destructive"
      >
        {copy.errors.generic}
      </p>
    );
  }

  if (isPending || !cart) {
    return (
      <div
        aria-busy="true"
        className="rounded-lg border border-gray-200 bg-gray-0 p-8 text-center type-body text-gray-500"
      >
        {copy.title}
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <section className="rounded-lg border border-gray-200 bg-gray-0 px-5 py-12 text-center sm:px-8">
        <h1 className="text-h2 font-bold">{copy.emptyTitle}</h1>
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
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
      <aside
        aria-labelledby="cart-summary-title"
        className="rounded-lg border border-gray-200 bg-gray-0 p-5 lg:sticky lg:top-4"
      >
        <h2 id="cart-summary-title" className="text-h3 font-bold">
          {copy.summary}
        </h2>
        <dl className="mt-5 space-y-3 type-body text-gray-600">
          <SummaryRow
            label={copy.subtotal}
            value={formatMoney(locale, cart.summary.subtotal)}
          />
          {isNonZero(cart.summary.productDiscountTotal) ? (
            <SummaryRow
              label={copy.productDiscount}
              value={`−${formatMoney(locale, cart.summary.productDiscountTotal)}`}
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
              value={`−${formatMoney(locale, cart.summary.couponDiscount)}`}
            />
          ) : null}
          <SummaryRow
            label={copy.vatIncluded}
            value={formatMoney(locale, cart.summary.vat.includedAmount)}
          />
        </dl>

        {cart.summary.freeShipping.enabled &&
        cart.summary.freeShipping.remaining !== null ? (
          <p className="mt-4 rounded-md bg-gold-50 px-3 py-2 type-body-sm text-gold-700">
            {cart.summary.freeShipping.qualifies
              ? copy.freeShippingQualified
              : `${copy.freeShippingRemaining}: ${formatMoney(locale, cart.summary.freeShipping.remaining)}`}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4">
          <span className="type-body-lg font-medium">{copy.total}</span>
          <strong className="text-h3">
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

        <section
          className="mt-5 rounded-md bg-gray-50 p-4"
          aria-labelledby="guest-coupon-title"
        >
          <h3 id="guest-coupon-title" className="type-body font-medium">
            {copy.couponGuestTitle}
          </h3>
          <p className="mt-1 type-body-sm text-gray-500">
            {copy.couponGuestDescription}
          </p>
          <Link
            href={{ pathname: "/login", query: { returnTo: "/cart" } }}
            className="mt-3 inline-flex rounded-sm type-body-sm font-medium text-gold-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copy.login}
          </Link>
        </section>
      </aside>
      <section aria-labelledby="cart-lines-title" className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 id="cart-lines-title" className="text-h2 font-bold">
            {copy.title}
          </h1>
          <Button
            variant="ghost"
            size="sm"
            loading={clearMutation.isPending}
            loadingLabel={copy.clearing}
            disabled={activeLineId !== null}
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

        <ul className="space-y-4">
          {cart.lines.map((line) => {
            const lineBusy = activeLineId === line.id;
            const attributes = Object.entries(line.variant.attributes);
            return (
              <li
                key={line.id}
                className="rounded-lg border border-gray-200 bg-gray-0 p-4 sm:p-5"
              >
                <article className="flex gap-4">
                  <Link
                    href={`/products/${line.product.slug}`}
                    className="relative size-24 shrink-0 overflow-hidden rounded-md bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-32"
                  >
                    {line.product.image ? (
                      <Image
                        src={line.product.image.src}
                        alt={line.product.name}
                        fill
                        sizes="(min-width: 640px) 128px, 96px"
                        className="object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="block size-full bg-gray-100"
                      />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/products/${line.product.slug}`}
                          className="text-h4 font-medium text-gray-900 hover:text-gold-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {line.product.name}
                        </Link>
                        <p className="mt-1 type-caption text-gray-400">
                          {copy.sku}: <bdi>{line.variant.sku}</bdi>
                        </p>
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
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                      >
                        <XIcon className="size-5" />
                      </button>
                    </div>

                    {attributes.length > 0 ? (
                      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 type-body-sm text-gray-600">
                        {attributes.map(([name, value]) => (
                          <div key={name} className="flex gap-1">
                            <dt>{name}:</dt>
                            <dd>{String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    {line.personalization?.text ? (
                      <p className="mt-2 type-body-sm text-gray-600">
                        {copy.personalization}:{" "}
                        <bdi>{line.personalization.text}</bdi>
                      </p>
                    ) : null}
                    <p
                      className={`mt-2 type-caption ${line.stock.status === "out_of_stock" ? "text-destructive" : line.stock.status === "low" ? "text-gold-700" : "text-success"}`}
                    >
                      {
                        copy.stock[
                          line.stock.status === "out_of_stock"
                            ? "outOfStock"
                            : line.stock.status
                        ]
                      }
                    </p>

                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <span className="block type-caption text-gray-400">
                          {copy.quantity}
                        </span>
                        <div className="mt-1 flex h-11 items-center rounded-md border border-gray-200">
                          <button
                            type="button"
                            aria-label={copy.decrease}
                            disabled={busy || line.quantity <= 1}
                            onClick={() =>
                              mutateQuantity(line.id, line.quantity - 1)
                            }
                            className="size-11 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-gray-300"
                          >
                            −
                          </button>
                          <output
                            aria-live="polite"
                            className="min-w-8 text-center type-body"
                          >
                            {line.quantity}
                          </output>
                          <button
                            type="button"
                            aria-label={copy.increase}
                            disabled={busy || line.quantity >= maxQuantity}
                            onClick={() =>
                              mutateQuantity(line.id, line.quantity + 1)
                            }
                            className="size-11 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-gray-300"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="text-end">
                        <span className="block type-caption text-gray-400">
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
                        <strong className="mt-1 block type-body-lg">
                          <span className="sr-only">{copy.lineTotal}: </span>
                          <bdi>{formatMoney(locale, line.lineTotal)}</bdi>
                        </strong>
                      </div>
                    </div>
                    {lineBusy ? (
                      <p
                        aria-live="polite"
                        className="mt-2 type-caption text-gray-500"
                      >
                        {removeMutation.isPending
                          ? copy.removing
                          : copy.quantity}
                      </p>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt>{label}</dt>
      <dd className="text-gray-900">
        <bdi>{value}</bdi>
      </dd>
    </div>
  );
}
