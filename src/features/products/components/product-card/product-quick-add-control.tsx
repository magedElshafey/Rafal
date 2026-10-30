"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TrashIcon } from "@phosphor-icons/react";
import type { Locale } from "next-intl";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { addCartLine } from "@/features/cart/actions/add-cart-line";
import { updateCartLine } from "@/features/cart/actions/update-cart-line";
import { removeCartLine } from "@/features/cart/actions/remove-cart-line";
import { currentCartQueryKey, currentCartQueryOptions, currentCartQueryKeyRoot, setCurrentCartQueryData } from "@/features/cart/api/cart-query";
import { cartMutationKey, cartMutationScope, cartMutationFilters } from "@/features/cart/api/cart-mutation";
import { useCurrentCart } from "@/features/cart/hooks/use-current-cart";
import type { CartSnapshot } from "@/features/cart/types/cart.types";
import { invalidateCartRecommendations } from "@/features/cart/api/cart-recommendations-query";
import { beginRecommendationTransition } from "@/features/cart/api/cart-recommendation-lifecycle";
import type {
  AddCartLineError,
  AddCartLineInput,
} from "@/features/cart/types/cart.types";
import { useBrowsingCity } from "@/features/location/components/browsing-city-provider";
import { ProductQuickAddSheet, type QuickAddSuccessHandler } from "@/features/products/components/product-card/product-quick-add-sheet";
import type { ListingQuickAdd } from "@/features/products/types/product-listing.types";
import {
  canStartQuickAdd,
  getDirectQuickAddInput,
  getQuickAddActivation,
  getQuickAddTriggerAccessibility,
  getProductCardCartLine,
  canIncrementProductCardLine,
} from "@/features/products/utils/listing-quick-add";
import { useRouter } from "@/i18n/navigation";
import { useRafalToast } from "@/lib/rafal-toast";

type ProductQuickAddControlProps = {
  onAdded?: QuickAddSuccessHandler;
  disabled?: boolean;
  locale: Locale;
  productId: string;
  productName: string;
  quickAdd: ListingQuickAdd;
  slug: string;
};

function errorKey(error: AddCartLineError) {
  switch (error.code) {
    case "location-required":
      return "errors.locationRequired";
    case "unavailable-at-location":
      return "errors.unavailableAtLocation";
    case "out-of-stock":
      return "errors.outOfStock";
    case "quantity-limit-exceeded":
      return "errors.quantityLimit";
    case "product-unavailable":
      return "errors.productUnavailable";
    case "variant-invalid":
      return "errors.variantInvalid";
    case "cart-session-failure":
      return "errors.cartSessionFailure";
    case "invalid-input":
    case "invalid-personalization":
    case "validation-rejected":
    case "line-not-found":
    case "service-unavailable":
      return "errors.serviceUnavailable";
  }
}

export function ProductQuickAddControl({
  onAdded,
  disabled = false,
  locale,
  productId,
  productName,
  quickAdd,
  slug,
}: ProductQuickAddControlProps) {
  const rafalToast = useRafalToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations("Common.productListing.quickAdd");
  const { committedCity, isChanging: cityTransitionLocked } = useBrowsingCity();
  const canonical = useQuery({
    ...currentCartQueryOptions(locale, null),
    select: (snapshot) => snapshot.maxCartItemQuantity,
  });
  const cart = useCurrentCart(locale, committedCity?.id ?? null);
  const activationLockedRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreTriggerFocus = useRef(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [isNavigating, startNavigation] = useTransition();
  const mutation = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: async (input: AddCartLineInput) => {
      await queryClient.cancelQueries({ queryKey: currentCartQueryKeyRoot });
      return addCartLine(input, locale);
    },
    onMutate: async () => {
      const transition = beginRecommendationTransition(queryClient);
      await transition.ready;
      return transition;
    },
    retry: false,
    onSuccess: (result) => {
      if (!result.ok) {
        rafalToast.error(t(errorKey(result.error)));
        return;
      }
      setCurrentCartQueryData(queryClient, locale, result.cart);
      void invalidateCartRecommendations(queryClient);
      if (onAdded) onAdded(result.cart, triggerRef.current);
      else rafalToast.success(t("success", { name: productName }));
    },
    onError: () => rafalToast.error(t("errors.serviceUnavailable")),
    onSettled: (_data, _error, _variables, transition) => {
      transition?.finish();
      activationLockedRef.current = false;
    },
  });
  const reconcile = async () => {
    await queryClient.invalidateQueries({ queryKey: currentCartQueryKeyRoot, refetchType: "none" });
    await queryClient.fetchQuery(currentCartQueryOptions(locale, null));
    if (cart.fulfillmentCityId !== null) {
      await queryClient.fetchQuery(currentCartQueryOptions(locale, cart.fulfillmentCityId));
    }
  };
  const edit = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    retry: false,
    mutationFn: async (input: { lineId: string; quantity: number | null }) => {
      await queryClient.cancelQueries({ queryKey: currentCartQueryKeyRoot });
      return input.quantity === null
        ? removeCartLine(input.lineId, locale)
        : updateCartLine(input.lineId, input.quantity, locale);
    },
    onSuccess: async (result, input) => {
      if (result.ok) {
        setCurrentCartQueryData(queryClient, locale, result.cart);
        if (input.quantity === null) void invalidateCartRecommendations(queryClient);
        else {
          const updated = result.cart.lines.find((item) => item.id === input.lineId);
          if (updated) setAnnouncement(`${productName}: ${t("sheet.quantityValue", { quantity: updated.quantity })}`);
        }
      } else {
        rafalToast.error(t(errorKey(result.error)));
        await reconcile().catch(() => {});
      }
    },
    onError: async () => {
      rafalToast.error(t("errors.serviceUnavailable"));
      await reconcile().catch(() => {});
    },
    onSettled: () => { activationLockedRef.current = false; },
  });
  const pending = mutation.isPending || edit.isPending || isNavigating;
  const line = getProductCardCartLine(cart.data, productId);
  const limitsUnavailable = canonical.isSuccess && canonical.data == null;
  // Retain known control eligibility during background refresh. Click-time guards
  // below still require fresh availability before submitting an increment.
  const displayProjection = cart.projectedCart && {
    ...cart.projectedCart,
    maxCartItemQuantity: canonical.data,
    lines: cart.projectedCart.lines.map((item) => item.id === line?.id ? { ...item, quantity: line.quantity } : item),
  };
  useEffect(() => {
    if (!pending && !line && restoreTriggerFocus.current) {
      restoreTriggerFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [pending, line]);
  const latestCart = () => {
    const current = queryClient.getQueryData<CartSnapshot>(currentCartQueryKey(locale, null));
    const projection = queryClient.getQueryState<CartSnapshot>(currentCartQueryKey(locale, cart.fulfillmentCityId));
    const latestLine = getProductCardCartLine(current, productId);
    const projectedLine = getProductCardCartLine(projection?.data, productId);
    const effectiveCityId = (current?.gift.isGift ? current.gift.recipient?.city.id : null) ?? committedCity?.id ?? null;
    return {
      current,
      ready: effectiveCityId === cart.fulfillmentCityId && cart.projectionReady && !projection?.isInvalidated && projection?.fetchStatus !== "fetching",
      projected: current && {
        ...current,
        maxCartItemQuantity: current.maxCartItemQuantity,
        lines: current.lines.map((item) => item.id === latestLine?.id && item.id === projectedLine?.id
          ? { ...item, availability: projectedLine.availability } : item),
      },
    };
  };
  const changeLine = (delta: -1 | 1 | null) => {
    const canonicalState = queryClient.getQueryState(currentCartQueryKey(locale, null));
    if (activationLockedRef.current || cityTransitionLocked || queryClient.isMutating(cartMutationFilters) > 0 ||
        canonicalState?.status === "error" || canonicalState?.fetchStatus === "fetching" || cart.isError ||
        canonicalState?.isInvalidated) return;
    const latest = latestCart();
    const target = getProductCardCartLine(latest.current, productId);
    // A stale rendered control must never edit a replacement or newly ambiguous line.
    if (!target || target.id !== line?.id) return;
    if (delta === -1 && target.quantity <= 1) return;
    if (delta === 1 && (disabled || !canIncrementProductCardLine(latest.projected, productId, cart.fulfillmentCityId, latest.ready))) return;
    activationLockedRef.current = true;
    restoreTriggerFocus.current = delta === null;
    setAnnouncement("");
    edit.mutate({ lineId: target.id, quantity: delta === null ? null : target.quantity + delta });
  };
  const triggerAccessibility = getQuickAddTriggerAccessibility(
    disabled || cityTransitionLocked || pending,
    selectorOpen,
  );
  const label =
    quickAdd.kind === "direct"
      ? t("add", { name: productName })
      : quickAdd.kind === "customize"
        ? t("customize", { name: productName })
        : t("chooseOptions", { name: productName });

  const handleActivate = () => {
    if (
      queryClient.isMutating(cartMutationFilters) > 0 ||
      !canStartQuickAdd({
        activationLocked: activationLockedRef.current,
        cityTransitionLocked,
        disabled,
        pending,
      })
    ) {
      return;
    }

    const activation = getQuickAddActivation(
      quickAdd,
      committedCity?.id ?? null,
    );
    if (activation === "direct") {
      const input = getDirectQuickAddInput(productId, quickAdd);
      if (!input) return;
      activationLockedRef.current = true;
      mutation.mutate(input);
      return;
    }

    if (activation === "selector") {
      setSelectorOpen(true);
      return;
    }

    startNavigation(() => router.push(`/products/${slug}`));
  };

  return (
    <>
      {line && !selectorOpen ? (
        <div className="absolute end-2 bottom-[var(--product-card-quick-add-offset-block-end)] z-20 flex max-w-[calc(100%-1rem)] items-center gap-1" aria-busy={pending || undefined}>
          <div className="flex h-8 min-w-0 items-center rounded-full bg-gold-500 text-gray-0 shadow-[var(--shadow-product-card-quick-add)]">
            <IconButton size="sm" className="text-inherit after:min-w-8 disabled:text-gray-0/50" variant="ghost" aria-label={t("decrease", { name: productName })}
              disabled={pending || cityTransitionLocked || canonical.isError || cart.isError || line.quantity <= 1}
              onClick={() => changeLine(-1)}>−</IconButton>
            <output className="min-w-4 text-center type-ui-sm tabular-nums" aria-live="off" aria-label={t("sheet.quantityValue", { quantity: line.quantity })}>{line.quantity}</output>
            <IconButton size="sm" className="text-inherit after:min-w-8 disabled:text-gray-0/50" variant="ghost" aria-label={t("increase", { name: productName })}
              disabled={pending || cityTransitionLocked || disabled || canonical.isError || cart.isError || !canIncrementProductCardLine(displayProjection, productId, cart.fulfillmentCityId, !!cart.projectedCart)}
              onClick={() => changeLine(1)}>+</IconButton>
          </div>
          <IconButton size="sm" className="bg-gray-0 text-gray-700 shadow-[var(--shadow-product-card-quick-add)] after:min-w-8" variant="ghost" aria-label={t("remove", { name: productName })}
            disabled={pending || cityTransitionLocked || canonical.isError || cart.isError}
            onClick={() => changeLine(null)}><TrashIcon aria-hidden="true" size={16} /></IconButton>
          {(canonical.isError || cart.isError || limitsUnavailable) && <>
            <span className="sr-only" role="status">{t("sheet.cartError")}</span>
            <button type="button" disabled={pending} className="absolute end-0 bottom-full mb-1 whitespace-nowrap rounded-sm bg-gray-0 px-2 type-caption underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { void reconcile().catch(() => rafalToast.error(t("errors.serviceUnavailable"))); }}>{t("sheet.retry")}</button>
          </>}
        </div>
      ) : <IconButton
        ref={triggerRef}
        aria-label={pending ? t("pending", { name: productName }) : label}
        aria-busy={pending || undefined}
        aria-disabled={triggerAccessibility.ariaDisabled || undefined}
        className="absolute end-2 bottom-[var(--product-card-quick-add-offset-block-end)] z-20 bg-gold-500 text-gray-0 shadow-[var(--shadow-product-card-quick-add)] aria-disabled:bg-gray-100 aria-disabled:text-gray-400"
        disabled={triggerAccessibility.disabled}
        onClick={handleActivate}
        size="sm"
        variant="filled"
      >
        <span aria-hidden="true" className="type-body-lg font-bold leading-none">
          +
        </span>
      </IconButton>}
      <span className="sr-only" role="status">{announcement}</span>
      {selectorOpen && quickAdd.kind !== "direct" ? (
        <ProductQuickAddSheet
          onAdded={onAdded}
          key={quickAdd.kind === "customize" ? slug : `${slug}:${committedCity?.id}`}
          cityId={committedCity?.id ?? null}
          locale={locale}
          onOpenChange={setSelectorOpen}
          productName={productName}
          returnFocusRef={triggerRef}
          slug={slug}
        />
      ) : null}
    </>
  );
}
