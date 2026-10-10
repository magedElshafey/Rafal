"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { useTranslations } from "next-intl";
import { useRef, useTransition } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { addCartLine } from "@/features/cart/actions/add-cart-line";
import { setCurrentCartQueryData } from "@/features/cart/api/cart-query";
import type {
  AddCartLineError,
  AddCartLineInput,
} from "@/features/cart/types/cart.types";
import { useBrowsingCity } from "@/features/location/components/browsing-city-provider";
import type { ListingQuickAdd } from "@/features/products/types/product-listing.types";
import {
  canStartQuickAdd,
  getDirectQuickAddInput,
} from "@/features/products/utils/listing-quick-add";
import { useRouter } from "@/i18n/navigation";
import { rafalToast } from "@/lib/rafal-toast";

type ProductQuickAddControlProps = {
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
  disabled = false,
  locale,
  productId,
  productName,
  quickAdd,
  slug,
}: ProductQuickAddControlProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations("Common.productListing.quickAdd");
  const { isChanging: cityTransitionLocked } = useBrowsingCity();
  const activationLockedRef = useRef(false);
  const [isNavigating, startNavigation] = useTransition();
  const mutation = useMutation({
    mutationFn: (input: AddCartLineInput) => addCartLine(input, locale),
    retry: false,
    onSuccess: (result) => {
      if (!result.ok) {
        rafalToast.error(t(errorKey(result.error)));
        return;
      }
      setCurrentCartQueryData(queryClient, locale, result.cart);
      rafalToast.success(t("success", { name: productName }));
    },
    onError: () => rafalToast.error(t("errors.serviceUnavailable")),
    onSettled: () => {
      activationLockedRef.current = false;
    },
  });
  const pending = mutation.isPending || isNavigating;
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

    const input = getDirectQuickAddInput(productId, quickAdd);
    if (input) {
      activationLockedRef.current = true;
      mutation.mutate(input);
      return;
    }

    startNavigation(() => router.push(`/products/${slug}`));
  };

  return (
    <IconButton
      aria-label={pending ? t("pending", { name: productName }) : label}
      aria-busy={pending || undefined}
      className="absolute end-2 bottom-[var(--product-card-quick-add-offset-block-end)] z-20 bg-gold-500 text-gray-0 shadow-[var(--shadow-product-card-quick-add)]"
      disabled={disabled || cityTransitionLocked || pending}
      onClick={handleActivate}
      size="sm"
      variant="filled"
    >
      <span aria-hidden="true" className="type-body-lg font-bold leading-none">
        +
      </span>
    </IconButton>
  );
}
