"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { addCartLine } from "@/features/cart/actions/add-cart-line";
import { setCurrentCartQueryData } from "@/features/cart/api/cart-query";
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
  const activationLockedRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [isNavigating, startNavigation] = useTransition();
  const mutation = useMutation({
    mutationFn: (input: AddCartLineInput) => addCartLine(input, locale),
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
  const pending = mutation.isPending || isNavigating;
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
      <IconButton
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
      </IconButton>
      {selectorOpen && committedCity && quickAdd.kind === "select-options" ? (
        <ProductQuickAddSheet
          onAdded={onAdded}
          key={`${slug}:${committedCity.id}`}
          cityId={committedCity.id}
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
