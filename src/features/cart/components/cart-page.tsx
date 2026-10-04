"use client";

import Image from "next/image";
import { CircleNotchIcon } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import type { Locale } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { isCancelledError } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { TruckIcon, XIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { VariantAttributeValue } from "@/components/ui/variant-attribute-value";
import { CartGift } from "@/features/cart/components/cart-gift";
import {
  CartCoupon,
  type CartCouponCopy,
} from "@/features/cart/components/cart-coupon";
import { useCartPageMutations } from "@/features/cart/hooks/use-cart-page-mutations";
import { useCurrentCart } from "@/features/cart/hooks/use-current-cart";
import { browsingCitySelectedEvent } from "@/features/location/browsing-city-events";
import type {
  CartMoney,
  CartMutationError,
  CartSnapshot,
} from "@/features/cart/types/cart.types";
import type { Coupon } from "@/features/offers/types/offers.types";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  getVariantAttributeEntries,
  getVariantAttributeLabel,
} from "@/lib/variant-attributes";

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
  variantAttributeLabels: { color: string; size: string };
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
  availability: {
    unavailable: string;
    unconfirmed: string;
    checkoutUnavailable: string;
  };
  freeShippingQualified: string;
  freeShippingRemaining: string;
  coupon: CartCouponCopy;
  errors: {
    generic: string;
    validation: string;
    notFound: string;
    retry: string;
  };
};

type CartPageProps = {
  availableCoupons: readonly Coupon[];
  canUseCoupons: boolean;
  copy: CartPageCopy;
  couponDiscoveryFailed: boolean;
  initialCart: CartSnapshot;
  locale: Locale;
  maxQuantity: number;
  selectedCityId: number | null;
};

function lineAvailabilityIssue(
  availability: CartSnapshot["lines"][number]["availability"],
  quantity: number,
  fulfillmentCityId: number | null,
): "unconfirmed" | "unavailable" | null {
  if (
    fulfillmentCityId === null ||
    !availability ||
    availability.cityId !== fulfillmentCityId
  ) {
    return "unconfirmed";
  }
  if (
    !availability.inStock ||
    availability.available < quantity
  ) {
    return "unavailable";
  }
  return null;
}

function isCartFulfillable(
  cart: CartSnapshot,
  fulfillmentCityId: number | null,
) {
  return (
    cart.lines.length > 0 &&
    cart.lines.every(
      (line) => lineAvailabilityIssue(
        line.availability,
        line.quantity,
        fulfillmentCityId,
      ) === null,
    )
  );
}

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
  availableCoupons,
  canUseCoupons,
  copy,
  couponDiscoveryFailed,
  initialCart,
  locale,
  maxQuantity,
  selectedCityId,
}: CartPageProps) {
  const router = useRouter();
  const [checkoutPreparing, setCheckoutPreparing] = useState(false);
  const [checkoutNavigationPending, startCheckoutNavigation] = useTransition();
  const [transitionCity, setTransitionCity] = useState<number | null>(null);
  const transitionCityRef = useRef<number | null>(null);
  const currentCityRef = useRef(selectedCityId);
  useEffect(() => { currentCityRef.current = selectedCityId; }, [selectedCityId]);
  useEffect(() => {
    const onCitySelected = (event: Event) => {
      const cityId = (event as CustomEvent<number>).detail;
      transitionCityRef.current = cityId;
      setTransitionCity(cityId);
    };
    window.addEventListener(browsingCitySelectedEvent, onCitySelected);
    return () => window.removeEventListener(browsingCitySelectedEvent, onCitySelected);
  }, []);
  const {
    data: cart,
    fulfillmentCityId,
    isError,
    isPending,
    refetch,
    projectionReady,
    projectionFetching,
    projectedCart,
    usesGiftFulfillment,
  } = useCurrentCart(locale, selectedCityId, initialCart);
  const fulfillmentCityRef = useRef(fulfillmentCityId);
  useEffect(() => {
    fulfillmentCityRef.current = fulfillmentCityId;
  }, [fulfillmentCityId]);
  const cityTransitionPending = !usesGiftFulfillment &&
    transitionCity !== null &&
    transitionCity !== selectedCityId;
  const [mutationError, setMutationError] = useState<string | null>(null);
  const handleMutationError = useCallback(
    (error: CartMutationError) =>
      setMutationError(errorMessage(error, copy.errors)),
    [copy.errors],
  );
  const mutations = useCartPageMutations({
    fulfillmentCityId,
    locale,
    maxQuantity,
    onError: handleMutationError,
    projectionFetching,
    projectionReady,
  });
  const summaryBusy =
    cityTransitionPending || projectionFetching || mutations.projectionPending;
  const [showSummaryBusy, setShowSummaryBusy] = useState(false);
  useEffect(() => {
    if (!summaryBusy) return;
    const timer = window.setTimeout(() => setShowSummaryBusy(true), 250);
    return () => {
      window.clearTimeout(timer);
      setShowSummaryBusy(false);
    };
  }, [summaryBusy]);
  const summaryBusyVisible = summaryBusy && showSummaryBusy;
  const checkoutPending = checkoutPreparing || checkoutNavigationPending;
  const mutateQuantity = (lineId: string, delta: -1 | 1) => {
    setMutationError(null);
    mutations.changeQuantity(lineId, delta);
  };

  const mutationErrorNotice = mutationError ? (
    <p
      role="alert"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-xl rounded-md border border-destructive/20 bg-gray-0 px-4 py-3 type-body-sm text-destructive shadow-lg md:bottom-6"
    >
      {mutationError}
    </p>
  ) : null;

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
        {mutationErrorNotice}
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
          onClick={() => {
            setMutationError(null);
            mutations.clear();
          }}
        >
          {copy.clear}
        </Button>
      </div>

      <ul className="overflow-hidden rounded-lg border border-gray-200 bg-gray-0 divide-y divide-gray-200">
        {cart.lines.map((line) => {
          const attributes = getVariantAttributeEntries(line.variant.attributes);
          const projectedAvailability = projectedCart?.lines.find(
            (candidate) => candidate.id === line.id,
          )?.availability;
          const availability =
            !cityTransitionPending &&
            fulfillmentCityId !== null &&
            projectedAvailability?.cityId === fulfillmentCityId
              ? projectedAvailability
              : undefined;
          const unavailable =
            !!availability &&
            (!availability.inStock || availability.available <= 0);
          const availabilityIssue =
            cityTransitionPending ||
            mutations.projectionPending ||
            projectionFetching
              ? null
              : mutations.projectionDirty || isError
                ? "unconfirmed"
                : lineAvailabilityIssue(
                    availability,
                    line.quantity,
                    fulfillmentCityId,
                  );
          return (
            <li key={line.id} className="p-4 sm:p-5">
              <article className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 sm:grid-cols-[6rem_minmax(0,1fr)_10rem]">
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
                          <dt>
                            {getVariantAttributeLabel(
                              name,
                              copy.variantAttributeLabels,
                            )}
                            :
                          </dt>
                          <dd className="flex items-center">
                            <VariantAttributeValue
                              attributeKey={name}
                              attributeValue={value}
                            />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {line.personalization?.text ? (
                    <p className="mt-2 type-body-sm text-gold-700">
                      {copy.personalization}: {" "}
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
                        {copy.unitPrice}: {" "}
                        {line.discountActive ? (
                          <del className="me-1">
                            <bdi>{formatMoney(locale, line.unitRegularPrice)}</bdi>
                          </del>
                        ) : null}
                        <bdi>{formatMoney(locale, line.unitPrice)}</bdi>
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={`${copy.remove}: ${line.product.name}`}
                      onClick={() => {
                        setMutationError(null);
                        mutations.removeLine(line.id);
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
                      disabled={line.quantity <= 1 || unavailable}
                      onClick={() => mutateQuantity(line.id, -1)}
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
                      disabled={
                        line.quantity >= maxQuantity ||
                        unavailable ||
                        (!!availability &&
                          line.quantity >= availability.available)
                      }
                      onClick={() => mutateQuantity(line.id, 1)}
                      className="size-11 text-lg hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:text-gray-300"
                    >
                      +
                    </button>
                  </div>
                </div>

                <p
                  aria-live="polite"
                  className={cn(
                    "col-span-2 grid min-h-5 type-caption sm:col-start-2 sm:col-span-2",
                    availabilityIssue ? "text-destructive" : "text-transparent",
                  )}
                >
                  <span aria-hidden="true" className="invisible col-start-1 row-start-1">
                    {copy.availability.unconfirmed}
                  </span>
                  <span className="col-start-1 row-start-1">
                    {availabilityIssue ? copy.availability[availabilityIssue] : "\u00a0"}
                  </span>
                </p>
              </article>
            </li>
          );
        })}
      </ul>
      <CartGift gift={cart.gift} locale={locale} />
    </section>
  );

  const cartFulfillable = projectionReady && !isError && !cityTransitionPending && !mutations.projectionDirty &&
    !mutations.projectionPending && isCartFulfillable(cart, fulfillmentCityId);

  const summarySection = (
    <aside
      aria-labelledby="cart-summary-title"
      aria-busy={summaryBusy}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="relative rounded-lg bg-gray-50 p-5 sm:p-6 lg:sticky lg:top-4"
    >
      <div className={cn(summaryBusyVisible && "opacity-70")}>
        <h2 id="cart-summary-title" className="text-h3 font-bold text-gray-1000">
          {copy.summary}
        </h2>
      {canUseCoupons ? (
        <CartCoupon
          availableCoupons={availableCoupons}
          coupon={cart.coupon}
          copy={copy.coupon}
          discoveryFailed={couponDiscoveryFailed}
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
        disabled={!cartFulfillable || checkoutPending}
        loading={checkoutPending}
        loadingLabel={copy.checkout}
        onClick={async () => {
          if (checkoutPending) return;
          setCheckoutPreparing(true);
          const fulfillmentIsCurrent = () =>
            fulfillmentCityRef.current === fulfillmentCityId &&
            (usesGiftFulfillment || (
              currentCityRef.current === selectedCityId &&
              (transitionCityRef.current === null || transitionCityRef.current === selectedCityId)
            ));
          try {
            if (!fulfillmentIsCurrent()) return;
            const result = await mutations.flushPendingMutations();
            if (!result.ok || !fulfillmentIsCurrent()) return;
            const projectedCart = await mutations.refreshProjection();
            if (
              fulfillmentIsCurrent() &&
              mutations.canNavigate() &&
              isCartFulfillable(projectedCart, fulfillmentCityId)
            ) {
              startCheckoutNavigation(() => router.push("/checkout"));
            }
          } catch (error) {
            if (isCancelledError(error) || (error instanceof DOMException && error.name === "AbortError")) return;
            setMutationError(copy.errors.generic);
          } finally {
            setCheckoutPreparing(false);
          }
        }}
      >
        {copy.checkout}
      </Button>
      <p className={cn("mt-3 min-h-10 type-caption text-destructive",
        (cartFulfillable || mutations.projectionPending || projectionFetching || cityTransitionPending) && "invisible")}
      >
        {copy.availability.checkoutUnavailable}
        </p>
      </div>
      {summaryBusyVisible ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <CircleNotchIcon className="size-4 animate-spin text-gray-700 motion-reduce:animate-none" />
        </div>
      ) : null}
    </aside>
  );

  return (
    <div>
      {mutationErrorNotice}
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
