"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations, type Locale } from "next-intl";
import { TrashIcon } from "@phosphor-icons/react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEventHandler,
  type ReactNode,
} from "react";

import { addCartLine } from "@/features/cart/actions/add-cart-line";
import { updateCartLine } from "@/features/cart/actions/update-cart-line";
import { removeCartLine } from "@/features/cart/actions/remove-cart-line";
import { currentCartQueryKey, currentCartQueryKeyRoot, currentCartQueryOptions, setCurrentCartQueryData } from "@/features/cart/api/cart-query";
import { cartMutationKey, cartMutationScope, cartMutationFilters } from "@/features/cart/api/cart-mutation";
import type { CartSnapshot } from "@/features/cart/types/cart.types";
import { IconButton } from "@/components/ui/icon-button";
import { getPdpCartLine, getPdpCartLineCeiling } from "@/features/products/utils/pdp-cart-selection";
import { invalidateCartRecommendations } from "@/features/cart/api/cart-recommendations-query";
import { beginRecommendationTransition } from "@/features/cart/api/cart-recommendation-lifecycle";
import { useCurrentCart } from "@/features/cart/hooks/use-current-cart";
import type {
  AddCartLineError,
  AddCartLineInput,
} from "@/features/cart/types/cart.types";
import { useBrowsingCity } from "@/features/location/components/browsing-city-provider";
import { ProductGallery } from "@/features/products/components/product-details/product-gallery";
import {
  ProductPurchasePanel,
  type ProductPurchasePanelCopy,
} from "@/features/products/components/product-details/product-purchase-panel";
import {
  ProductPurchaseSuccessSheet,
  type ProductPurchaseSuccessCopy,
} from "@/features/products/components/product-details/product-purchase-success-sheet";
import { ProductStickyPurchaseActions } from "@/features/products/components/product-details/product-sticky-purchase-actions";
import type { VariantAvailabilityById } from "@/features/products/types/product-availability.types";
import type {
  PersonalizationLanguage,
  ProductDetails,
  ProductPersonalizationInput,
  ProductVariant,
} from "@/features/products/types/product-details.types";
import { getInitialProductVariant } from "@/features/products/utils/get-initial-product-variant";
import {
  getSelectedOptionsFromVariant,
  resolveProductVariant,
  type SelectedProductOptions,
} from "@/features/products/utils/product-variant-resolver";
import { resolveGalleryImageId } from "@/features/products/utils/product-gallery";
import { validateProductPersonalization } from "@/features/products/utils/validate-product-personalization";
import { formatProductMessage } from "@/features/products/utils/format-product-message";
import { useRouter } from "@/i18n/navigation";

export type ProductPurchaseData = Pick<
  ProductDetails,
  | "id"
  | "isWishlisted"
  | "images"
  | "name"
  | "options"
  | "personalization"
  | "ratingSummary"
  | "socialProof"
  | "variants"
>;

export type ProductPurchaseExperienceCopy = {
  gallery: {
    closeLightbox: string;
    imagePositionTemplate: string;
    lightboxTitleTemplate: string;
    nextImage: string;
    openImageTemplate: string;
    previousImage: string;
    selectImageTemplate: string;
  };
  panel: ProductPurchasePanelCopy;
  purchase: {
    adding: string;
    errors: {
      cartSessionFailure: string;
      invalidInput: string;
      invalidPersonalization: string;
      locationRequired: string;
      outOfStock: string;
      productUnavailable: string;
      quantityLimitTemplate: string;
      serviceUnavailable: string;
      unavailableAtLocation: string;
      variantInvalid: string;
    };
    sticky: {
      desktopLabel: string;
      mobileLabel: string;
    };
    success: ProductPurchaseSuccessCopy;
  };
};

type ProductPurchaseExperienceProps = {
  availabilityByVariantId: VariantAvailabilityById;
  bnplInformation: ReactNode;
  copy: ProductPurchaseExperienceCopy;
  locale: Locale;
  locationAction: ReactNode;
  locationInCoverage: boolean | null;
  locationName: string | null;
  product: ProductPurchaseData;
  renderedAt: number;
  shareActions: ReactNode;
};

function getPreferredImageId(
  product: ProductPurchaseData,
  variant: ProductVariant | null,
): string | null {
  return (
    variant?.imageIds.find((candidate) =>
      product.images.some((image) => image.id === candidate),
    ) ??
    product.images[0]?.id ??
    null
  );
}

function getInitialPersonalizationInput(
  product: ProductPurchaseData,
): ProductPersonalizationInput | null {
  if (!product.personalization.enabled) return null;

  const [language] = product.personalization.allowedLanguages;
  if (!language) return null;

  return { language, text: "" };
}

function getAddToCartErrorMessage(
  error: AddCartLineError,
  copy: ProductPurchaseExperienceCopy["purchase"]["errors"],
): string {
  switch (error.code) {
    case "invalid-input":
      return copy.invalidInput;
    case "product-unavailable":
      return copy.productUnavailable;
    case "variant-invalid":
      return copy.variantInvalid;
    case "location-required":
      return copy.locationRequired;
    case "unavailable-at-location":
      return copy.unavailableAtLocation;
    case "out-of-stock":
      return copy.outOfStock;
    case "quantity-limit-exceeded":
      return formatProductMessage(copy.quantityLimitTemplate, {
        max: error.maxOrderQuantity,
      });
    case "invalid-personalization":
      return copy.invalidPersonalization;
    case "validation-rejected":
      return copy.invalidInput;
    case "line-not-found":
      return copy.serviceUnavailable;
    case "cart-session-failure":
      return copy.cartSessionFailure;
    case "service-unavailable":
      return copy.serviceUnavailable;
  }
}

export function ProductPurchaseExperience({
  availabilityByVariantId,
  bnplInformation,
  copy,
  locale,
  locationAction,
  locationInCoverage,
  locationName,
  product,
  renderedAt,
  shareActions,
}: ProductPurchaseExperienceProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const tCart = useTranslations("Common.productListing.quickAdd");
  const { committedCity, isChanging: cityTransitionLocked } = useBrowsingCity();
  const canonical = useQuery({ ...currentCartQueryOptions(locale, null), select: (cart) => cart.maxCartItemQuantity });
  const cartQuery = useCurrentCart(locale, committedCity?.id ?? null);
  const currentCart = cartQuery.data;
  const activationLockedRef = useRef(false);
  const restoreSurfaceRef = useRef<HTMLElement | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const reconcileCart = async () => {
    await queryClient.invalidateQueries({ queryKey: currentCartQueryKeyRoot, refetchType: "none" });
    const cart = await queryClient.fetchQuery(currentCartQueryOptions(locale, null));
    const cityId = (cart.gift.isGift ? cart.gift.recipient?.city.id : null) ?? committedCity?.id;
    if (cityId !== undefined) await queryClient.fetchQuery(currentCartQueryOptions(locale, cityId));
  };
  const initialVariant =
    product.variants.find(
      (variant) => availabilityByVariantId[variant.id]?.status === "available",
    ) ?? getInitialProductVariant(product);
  const initialImageId = getPreferredImageId(product, initialVariant);
  const selectionRef = useRef<string | null>(initialVariant?.id ?? null);
  const purchaseActionRef = useRef<HTMLDivElement>(null);
  const lastAddToCartTriggerRef = useRef<HTMLElement | null>(null);
  const lastAddSurfaceRef = useRef<HTMLElement | null>(null);
  const [isSuccessSheetOpen, setIsSuccessSheetOpen] = useState(false);
  const [isStickyPurchaseVisible, setIsStickyPurchaseVisible] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<SelectedProductOptions>(() =>
    initialVariant ? getSelectedOptionsFromVariant(initialVariant) : {},
  );
  const [selectedImageId, setSelectedImageId] = useState(() => initialImageId);
  const [quantity, setQuantity] = useState(1);
  const [personalizationInput, setPersonalizationInput] = useState(() =>
    getInitialPersonalizationInput(product),
  );
  const [personalizationResetKey, setPersonalizationResetKey] = useState(0);
  const [
    submittedConfigurationFingerprint,
    setSubmittedConfigurationFingerprint,
  ] = useState<string | null>(null);
  const {
    data: addToCartResult,
    isError: isAddToCartError,
    isPending: isAddingToCart,
    mutate: mutateAddToCart,
    reset: resetAddToCartMutation,
  } = useMutation({
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
    onSettled: (_data, _error, _variables, transition) => {
      transition?.finish();
      activationLockedRef.current = false;
    },
    retry: false,
    onError: async () => { await reconcileCart().catch(() => {}); },
    onSuccess: async (result) => {
      if (!result.ok) {
        await reconcileCart().catch(() => {});
        return;
      }

      setCurrentCartQueryData(queryClient, locale, result.cart);
      void invalidateCartRecommendations(queryClient);
      setQuantity(1);
      setPersonalizationInput(getInitialPersonalizationInput(product));
      setPersonalizationResetKey((currentKey) => currentKey + 1);
      setIsSuccessSheetOpen(true);
    },
  });
  const selectedVariant = resolveProductVariant(product.variants, selectedOptions);
  useEffect(() => { selectionRef.current = selectedVariant?.id ?? null; }, [selectedVariant?.id]);
  const cartLine = getPdpCartLine(currentCart, product.id, selectedVariant?.id ?? null, product.personalization.enabled);
  useEffect(() => {
    if (isSuccessSheetOpen && cartLine && !isAddingToCart) {
      lastAddToCartTriggerRef.current = lastAddSurfaceRef.current?.querySelector<HTMLElement>("[data-pdp-cart-controls] button:not(:disabled)") ?? null;
    }
  }, [isSuccessSheetOpen, cartLine, isAddingToCart]);
  const edit = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    retry: false,
    mutationFn: async (input: { lineId: string; variantId: string; quantity: number | null }) => {
      await queryClient.cancelQueries({ queryKey: currentCartQueryKeyRoot });
      return input.quantity === null ? removeCartLine(input.lineId, locale) : updateCartLine(input.lineId, input.quantity, locale);
    },
    onSuccess: async (result, input) => {
      if (!result.ok) { await reconcileCart().catch(() => {}); return; }
      setCurrentCartQueryData(queryClient, locale, result.cart);
      if (input.quantity === null) {
        void invalidateCartRecommendations(queryClient);
        if (selectionRef.current === input.variantId) setQuantity(1);
      } else if (selectionRef.current === input.variantId) {
        const updated = result.cart.lines.find((line) => line.id === input.lineId);
        if (updated) setAnnouncement(formatProductMessage(copy.panel.quantity.labelTemplate, { value: updated.quantity }));
      }
    },
    onError: async () => { await reconcileCart().catch(() => {}); },
    onSettled: () => { activationLockedRef.current = false; },
  });
  const isEditingSelection = edit.isPending && edit.variables?.variantId === selectedVariant?.id;
  const editFailure = edit.variables?.variantId !== selectedVariant?.id ? null : edit.isError
    ? { code: "service-unavailable" as const } : edit.data && !edit.data.ok ? edit.data.error : null;
  useEffect(() => {
    if (!edit.isPending && !cartLine && restoreSurfaceRef.current) {
      const surface = restoreSurfaceRef.current;
      restoreSurfaceRef.current = null;
      if (selectionRef.current === edit.variables?.variantId && !surface.closest("[inert]")) {
        const add = surface.querySelector<HTMLButtonElement>("[data-pdp-add]");
        if (add && !add.disabled) add.focus({ preventScroll: true });
        else surface.focus({ preventScroll: true });
      }
    }
  }, [cartLine, edit.isPending, edit.variables?.variantId]);
  const presentationVariant = selectedVariant ?? initialVariant;
  // Reconcile removed media at the existing selection owner before children
  // render. Do not keep a stale ID that could reappear on a later data update.
  const validImageId = resolveGalleryImageId(
    product.images,
    selectedImageId,
    presentationVariant?.imageIds,
  );
  if (validImageId !== selectedImageId) setSelectedImageId(validImageId);
  const availability = selectedVariant
    ? availabilityByVariantId[selectedVariant.id] ?? { status: "purchase_unavailable" as const }
    : { status: "purchase_unavailable" as const };
  const personalizationValidation =
    product.personalization.enabled && personalizationInput
      ? validateProductPersonalization(
          product.personalization,
          personalizationInput,
        )
      : null;
  const personalizationIsValid = product.personalization.enabled
    ? personalizationValidation?.valid === true
    : true;
  const hasVerifiedAvailability = availability?.status === "available";
  const heldForVariant =
    selectedVariant && currentCart
      ? currentCart.lines.reduce(
          (held, line) =>
            line.variant.id === selectedVariant.id
              ? held + line.quantity
              : held,
          0,
        )
      : null;
  const remainingAddable =
    availability?.status === "available" && heldForVariant !== null
      ? Math.max(0, availability.maxOrderQuantity - heldForVariant)
      : null;
  const purchaseQuantity =
    remainingAddable === null
      ? 1
      : Math.min(quantity, remainingAddable);
  const productIsAvailable = Object.values(availabilityByVariantId).some(
    (variantAvailability) => variantAvailability.status === "available",
  );
  const canAddToCart =
    !cityTransitionLocked &&
    !isRecovering && !canonical.isError && !cartQuery.isError &&
    productIsAvailable &&
    selectedVariant !== null &&
    purchaseQuantity >= 1 &&
    hasVerifiedAvailability &&
    remainingAddable !== null &&
    remainingAddable > 0 &&
    purchaseQuantity <= remainingAddable &&
    personalizationIsValid;
  const configurationFingerprint = JSON.stringify([
    selectedVariant?.id,
    purchaseQuantity,
    personalizationInput?.language,
    personalizationInput?.text,
    availability?.status,
    availability?.status === "available" ? availability.maxOrderQuantity : null,
    heldForVariant,
    remainingAddable,
  ]);
  const previousConfigurationRef = useRef(configurationFingerprint);
  const previousAvailabilityContextRef = useRef(availabilityByVariantId);
  const mutationFailure = isAddToCartError
    ? ({ code: "service-unavailable" } satisfies AddCartLineError)
    : addToCartResult && !addToCartResult.ok
      ? addToCartResult.error
      : null;
  const hasAddToCartFailure = mutationFailure !== null;
  const addToCartErrorMessage =
    mutationFailure &&
    submittedConfigurationFingerprint === configurationFingerprint
      ? getAddToCartErrorMessage(mutationFailure, copy.purchase.errors)
      : null;
  const purchaseErrorMessage = editFailure ? getAddToCartErrorMessage(editFailure, copy.purchase.errors) : addToCartErrorMessage ??
    (canonical.isError || cartQuery.isError ? copy.purchase.errors.serviceUnavailable : null);
  const successfulCart =
    addToCartResult?.ok === true ? addToCartResult.cart : undefined;

  useEffect(() => {
    const target = purchaseActionRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      setIsStickyPurchaseVisible(
        !entry.isIntersecting && entry.boundingClientRect.bottom <= 0,
      );
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (previousConfigurationRef.current === configurationFingerprint) return;

    previousConfigurationRef.current = configurationFingerprint;
    if (!isAddingToCart && hasAddToCartFailure) resetAddToCartMutation();
  }, [
    configurationFingerprint,
    hasAddToCartFailure,
    isAddingToCart,
    resetAddToCartMutation,
  ]);

  useEffect(() => {
    if (
      previousAvailabilityContextRef.current === availabilityByVariantId ||
      isAddingToCart
    ) {
      return;
    }

    previousAvailabilityContextRef.current = availabilityByVariantId;
    if (hasAddToCartFailure) resetAddToCartMutation();
  }, [
    availabilityByVariantId,
    hasAddToCartFailure,
    isAddingToCart,
    resetAddToCartMutation,
  ]);

  const handleSelectOption = (optionId: string, valueId: string) => {
    if (cityTransitionLocked) return;
    const option = product.options.find((candidate) => candidate.id === optionId);
    if (!option?.values.some((value) => value.id === valueId)) return;
    const selectable = product.variants.some(
      (candidate) => candidate.attributes[optionId] === valueId &&
        availabilityByVariantId[candidate.id]?.status === "available",
    );
    if (!selectable) return;

    const nextOptions = { ...selectedOptions, [optionId]: valueId };
    setSelectedOptions(nextOptions);
    const nextVariant = resolveProductVariant(product.variants, nextOptions);
    selectionRef.current = nextVariant?.id ?? null;
    restoreSurfaceRef.current = null;
    setAnnouncement("");
    setQuantity(1);
    if (!nextVariant) return;
    const nextAvailability = availabilityByVariantId[nextVariant.id];
    if (nextAvailability?.status !== "available") return;
    setSelectedImageId(getPreferredImageId(product, nextVariant));
  };

  const handleDecreaseQuantity = () => {
    setQuantity(Math.max(1, purchaseQuantity - 1));
  };

  const handleIncreaseQuantity = () => {
    if (remainingAddable === null || remainingAddable === 0) return;
    setQuantity(Math.min(remainingAddable, purchaseQuantity + 1));
  };

  const handleSelectPersonalizationLanguage = (
    language: PersonalizationLanguage,
  ) => {
    setPersonalizationInput((currentInput) =>
      currentInput ? { ...currentInput, language } : currentInput,
    );
  };

  const handleChangePersonalizationText = (text: string) => {
    setPersonalizationInput((currentInput) =>
      currentInput ? { ...currentInput, text } : currentInput,
    );
  };

  const handleAddToCart: MouseEventHandler<HTMLButtonElement> = (event) => {
    lastAddToCartTriggerRef.current = event.currentTarget;
    if (
      cityTransitionLocked ||
      activationLockedRef.current || queryClient.isMutating(cartMutationFilters) > 0 ||
      selectionRef.current !== selectedVariant?.id || cartLine !== null ||
      !canAddToCart ||
      isAddingToCart ||
      !selectedVariant
    ) return;

    const latest = queryClient.getQueryState<CartSnapshot>(currentCartQueryKey(locale, null));
    if (!latest?.data || latest.isInvalidated || latest.status === "error" || latest.fetchStatus === "fetching" ||
      getPdpCartLine(latest.data, product.id, selectedVariant.id, product.personalization.enabled)) return;
    const held = latest.data.lines.reduce((sum, line) => line.variant.id === selectedVariant.id ? sum + line.quantity : sum, 0);
    if (availability.status !== "available" || purchaseQuantity > availability.maxOrderQuantity - held) return;
    lastAddSurfaceRef.current = event.currentTarget.closest<HTMLElement>("[data-pdp-purchase-surface]");

    const input: AddCartLineInput = {
      productId: product.id,
      variantId: selectedVariant.id,
      quantity: purchaseQuantity,
      ...(product.personalization.enabled && personalizationInput
        ? { personalization: personalizationInput }
        : {}),
    };

    setSubmittedConfigurationFingerprint(configurationFingerprint);
    activationLockedRef.current = true;
    resetAddToCartMutation();
    mutateAddToCart(input);
  };

  const handleCheckout = () => {
    setIsSuccessSheetOpen(false);
    router.push("/checkout");
  };

  const formattedSelectedPrice = presentationVariant
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: presentationVariant.pricing.current.currency,
      }).format(presentationVariant.pricing.current.amount)
    : null;

  const editLine = (delta: -1 | 1 | null, target: HTMLButtonElement) => {
    if (activationLockedRef.current || isRecovering || cityTransitionLocked || queryClient.isMutating(cartMutationFilters) > 0 ||
      selectionRef.current !== selectedVariant?.id || !cartLine) return;
    const state = queryClient.getQueryState<CartSnapshot>(currentCartQueryKey(locale, null));
    if (!state?.data || state.isInvalidated || state.status === "error" || state.fetchStatus === "fetching") return;
    const line = getPdpCartLine(state.data, product.id, selectionRef.current, product.personalization.enabled);
    if (!line || line.id !== cartLine.id) return;
    if (delta === -1 && line.quantity <= 1) return;
    if (delta === 1) {
      const cityId = (state.data.gift.isGift ? state.data.gift.recipient?.city.id : null) ?? committedCity?.id ?? null;
      const projection = queryClient.getQueryState<CartSnapshot>(currentCartQueryKey(locale, cityId));
      const ceiling = getPdpCartLineCeiling(state.data, projection?.data, line.id, cityId);
      if (cityId !== cartQuery.fulfillmentCityId || !cartQuery.projectionReady || projection?.isInvalidated ||
        projection?.status === "error" || projection?.fetchStatus === "fetching" || ceiling === null || line.quantity >= ceiling) return;
    }
    activationLockedRef.current = true;
    restoreSurfaceRef.current = delta === null ? target.closest<HTMLElement>("[data-pdp-purchase-surface]") : null;
    setAnnouncement("");
    edit.mutate({ lineId: line.id, variantId: line.variant.id, quantity: delta === null ? null : line.quantity + delta });
  };
  const ceiling = cartLine ? getPdpCartLineCeiling(currentCart && { ...currentCart, maxCartItemQuantity: canonical.data }, cartQuery.projectedCart, cartLine.id, cartQuery.fulfillmentCityId) : null;
  const cartBlocked = isEditingSelection || isAddingToCart || isRecovering || cityTransitionLocked || canonical.isError || cartQuery.isError;
  const recoveryControl = (canonical.isError || cartQuery.isError || canonical.data == null) ? <button type="button" className="type-caption underline focus-visible:ring-2 focus-visible:ring-ring" disabled={isRecovering || isEditingSelection || isAddingToCart || cityTransitionLocked} onClick={() => {
    setIsRecovering(true);
    void reconcileCart().then(() => edit.reset()).catch(() => {}).finally(() => setIsRecovering(false));
  }}>{tCart("sheet.retry")}</button> : null;
  const cartControls = cartLine ? (
    <div data-pdp-cart-controls className="flex flex-wrap items-center gap-3" aria-busy={isEditingSelection || isRecovering || undefined}>
      <div className="flex h-11 items-center rounded-full bg-gold-500 text-gray-0 shadow-[var(--shadow-product-card-quick-add)]">
        <IconButton size="md" className="size-11 text-inherit disabled:text-gray-0/50" variant="ghost" aria-label={tCart("decrease", { name: product.name })} disabled={cartBlocked || cartLine.quantity <= 1} onClick={(event) => editLine(-1, event.currentTarget)}>−</IconButton>
        <output className="min-w-8 text-center type-body tabular-nums" aria-live="off" aria-label={copy.panel.quantity.title}>{cartLine.quantity}</output>
        <IconButton size="md" className="size-11 text-inherit disabled:text-gray-0/50" variant="ghost" aria-label={tCart("increase", { name: product.name })} disabled={cartBlocked || ceiling === null || cartLine.quantity >= ceiling} onClick={(event) => editLine(1, event.currentTarget)}>+</IconButton>
      </div>
      <IconButton size="md" className="size-11 bg-gray-0 text-gray-700 shadow-[var(--shadow-product-card-quick-add)]" variant="ghost" aria-label={tCart("remove", { name: product.name })} disabled={cartBlocked} onClick={(event) => editLine(null, event.currentTarget)}><TrashIcon aria-hidden="true" size={20} /></IconButton>
      {recoveryControl}
    </div>
  ) : undefined;

  return (
    <>
      <div className="mt-6 grid grid-cols-1 items-start gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-8 xl:gap-12">
        <div className="min-w-0 lg:order-2">
          <ProductGallery
            copy={copy.gallery}
            direction={locale === "ar" ? "rtl" : "ltr"}
            images={product.images}
            initialImageId={initialImageId}
            onSelectImage={setSelectedImageId}
            productName={product.name}
            selectedImageId={validImageId}
          />
        </div>
        <div className="min-w-0 lg:order-1">
          <ProductPurchasePanel
            cartControls={cartControls}
            addToCartErrorMessage={purchaseErrorMessage}
            addingToCartLabel={copy.purchase.adding}
            availability={availability}
            availabilityByVariantId={availabilityByVariantId}
            bnplInformation={bnplInformation}
            canAddToCart={canAddToCart}
            copy={copy.panel}
            isAddingToCart={isAddingToCart}
            locale={locale}
            locationAction={locationAction}
            locationInCoverage={locationInCoverage}
            locationName={locationName}
            onAddToCart={handleAddToCart}
            onDecreaseQuantity={handleDecreaseQuantity}
            onIncreaseQuantity={handleIncreaseQuantity}
            onChangePersonalizationText={handleChangePersonalizationText}
            onSelectPersonalizationLanguage={
              handleSelectPersonalizationLanguage
            }
            onSelectOption={handleSelectOption}
            personalizationInput={personalizationInput}
            personalizationResetKey={personalizationResetKey}
            personalizationValidation={personalizationValidation}
            product={product}
            purchaseActionRef={purchaseActionRef}
            quantity={purchaseQuantity}
            remainingAddable={remainingAddable}
            renderedAt={renderedAt}
            selectedOptions={selectedOptions}
            shareActions={shareActions}
            variant={presentationVariant}
          />
          {!cartLine && recoveryControl}
        </div>
      </div>

      <ProductStickyPurchaseActions
        cartControls={cartControls}
        addToCartLabel={copy.panel.addToCart}
        addingLabel={copy.purchase.adding}
        canAddToCart={canAddToCart}
        desktopLabel={copy.purchase.sticky.desktopLabel}
        errorMessage={purchaseErrorMessage}
        formattedPrice={formattedSelectedPrice}
        isPending={isAddingToCart}
        isVisible={isStickyPurchaseVisible}
        mobileLabel={copy.purchase.sticky.mobileLabel}
        onAddToCart={handleAddToCart}
        productName={product.name}
      />

      <ProductPurchaseSuccessSheet
        cart={successfulCart}
        copy={copy.purchase.success}
        locale={locale}
        onCheckout={handleCheckout}
        onOpenChange={setIsSuccessSheetOpen}
        open={isSuccessSheetOpen}
        returnFocusRef={lastAddToCartTriggerRef}
      />
      <span className="sr-only" role="status">{announcement}</span>
    </>
  );
}
