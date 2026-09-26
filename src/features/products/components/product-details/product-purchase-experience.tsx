"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  type MouseEventHandler,
  type ReactNode,
} from "react";

import { addCartLine } from "@/features/cart/actions/add-cart-line";
import { setCurrentCartQueryData } from "@/features/cart/api/cart-query";
import type {
  AddCartLineError,
  AddCartLineInput,
} from "@/features/cart/types/cart.types";
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
} from "@/features/products/utils/product-variant-resolver";
import { validateProductPersonalization } from "@/features/products/utils/validate-product-personalization";
import { formatProductMessage } from "@/features/products/utils/format-product-message";
import { useRouter } from "@/i18n/navigation";

export type ProductPurchaseData = Pick<
  ProductDetails,
  | "id"
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
  allowUnverifiedPurchase: boolean;
  availabilityByVariantId: VariantAvailabilityById;
  bnplInformation: ReactNode;
  copy: ProductPurchaseExperienceCopy;
  locale: Locale;
  locationName: string | null;
  product: ProductPurchaseData;
  renderedAt: number;
  shareActions: ReactNode;
  wishlistEnabled: boolean;
};

function getPreferredImageId(
  product: ProductPurchaseData,
  variant: ProductVariant,
): string | null {
  return (
    variant.imageIds.find((candidate) =>
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
  if (!language) {
    throw new Error(
      `Product "${product.id}" enables personalization without an allowed language.`,
    );
  }

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
  allowUnverifiedPurchase,
  availabilityByVariantId,
  bnplInformation,
  copy,
  locale,
  locationName,
  product,
  renderedAt,
  shareActions,
  wishlistEnabled,
}: ProductPurchaseExperienceProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const initialVariant = getInitialProductVariant(product);
  const initialImageId = getPreferredImageId(product, initialVariant);
  const purchaseActionRef = useRef<HTMLDivElement>(null);
  const lastAddToCartTriggerRef = useRef<HTMLElement | null>(null);
  const [isSuccessSheetOpen, setIsSuccessSheetOpen] = useState(false);
  const [isStickyPurchaseVisible, setIsStickyPurchaseVisible] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState(() =>
    getSelectedOptionsFromVariant(initialVariant),
  );
  const [selectedImageId, setSelectedImageId] = useState(() =>
    initialImageId,
  );
  const [quantity, setQuantity] = useState(1);
  const [personalizationInput, setPersonalizationInput] = useState(() =>
    getInitialPersonalizationInput(product),
  );
  const [submittedConfigurationFingerprint, setSubmittedConfigurationFingerprint] =
    useState<string | null>(null);
  const {
    data: addToCartResult,
    isError: isAddToCartError,
    isPending: isAddingToCart,
    mutate: mutateAddToCart,
    reset: resetAddToCartMutation,
  } = useMutation({
    mutationFn: (input: AddCartLineInput) => addCartLine(input, locale),
    retry: false,
    onSuccess: (result) => {
      if (!result.ok) return;

      setCurrentCartQueryData(queryClient, locale, result.cart);
      setIsSuccessSheetOpen(true);
    },
  });
  const selectedVariant = resolveProductVariant(
    product.options,
    product.variants,
    selectedOptions,
  );
  const availability = selectedVariant
    ? availabilityByVariantId[selectedVariant.id]
    : undefined;
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
  const canSubmitUnverifiedPurchase =
    allowUnverifiedPurchase &&
    availability?.status === "purchase_unavailable" &&
    quantity === 1;
  const canAddToCart =
    selectedVariant !== null &&
    quantity >= 1 &&
    ((hasVerifiedAvailability &&
      quantity <= availability.maxOrderQuantity) ||
      canSubmitUnverifiedPurchase) &&
    personalizationIsValid;
  const configurationFingerprint = JSON.stringify([
    selectedVariant?.id,
    quantity,
    personalizationInput?.language,
    personalizationInput?.text,
    availability?.status,
    availability?.status === "available"
      ? availability.maxOrderQuantity
      : null,
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
  const quantityErrorMessage =
    availability?.status === "available" &&
    quantity > availability.maxOrderQuantity
      ? formatProductMessage(copy.purchase.errors.quantityLimitTemplate, {
          max: availability.maxOrderQuantity,
        })
      : null;
  const purchaseErrorMessage =
    addToCartErrorMessage ?? quantityErrorMessage;
  const successfulCart =
    addToCartResult?.ok === true
      ? addToCartResult.cart
      : undefined;

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

  if (!selectedVariant) {
    throw new Error(
      `Product "${product.id}" selection does not resolve to an exact variant.`,
    );
  }

  if (!availability) {
    throw new Error(
      `Product variant "${selectedVariant.id}" is missing resolved availability.`,
    );
  }

  const handleSelectOption = (optionId: string, valueId: string) => {
    const nextSelection = { ...selectedOptions, [optionId]: valueId };
    const nextVariant = resolveProductVariant(
      product.options,
      product.variants,
      nextSelection,
    );
    if (!nextVariant) return;

    const nextAvailability = availabilityByVariantId[nextVariant.id];
    if (!nextAvailability) {
      throw new Error(
        `Product variant "${nextVariant.id}" is missing resolved availability.`,
      );
    }

    setSelectedOptions(nextSelection);
    setSelectedImageId(getPreferredImageId(product, nextVariant));
  };

  const handleDecreaseQuantity = () => {
    setQuantity((currentQuantity) => Math.max(1, currentQuantity - 1));
  };

  const handleIncreaseQuantity = () => {
    if (availability.status !== "available") return;
    setQuantity((currentQuantity) =>
      Math.min(availability.maxOrderQuantity, currentQuantity + 1),
    );
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
    if (!canAddToCart || isAddingToCart) return;

    const input: AddCartLineInput = {
      productId: product.id,
      variantId: selectedVariant.id,
      quantity,
      ...(product.personalization.enabled && personalizationInput
        ? { personalization: personalizationInput }
        : {}),
    };

    setSubmittedConfigurationFingerprint(configurationFingerprint);
    resetAddToCartMutation();
    mutateAddToCart(input);
  };

  const handleCheckout = () => {
    setIsSuccessSheetOpen(false);
    router.push("/checkout");
  };

  const formattedSelectedPrice = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: selectedVariant.pricing.current.currency,
  }).format(selectedVariant.pricing.current.amount);

  return (
    <>
      <div className="mt-7 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12 rtl:lg:flex-row-reverse">
        <div className="min-w-0 lg:w-[44%]">
          <ProductGallery
            copy={copy.gallery}
            direction={locale === "ar" ? "rtl" : "ltr"}
            images={product.images}
            initialImageId={initialImageId}
            onSelectImage={setSelectedImageId}
            productId={product.id}
            productName={product.name}
            selectedImageId={selectedImageId}
            wishlistEnabled={wishlistEnabled}
          />
        </div>
        <div className="min-w-0 flex-1">
          <ProductPurchasePanel
            addToCartErrorMessage={purchaseErrorMessage}
            addingToCartLabel={copy.purchase.adding}
            availability={availability}
            bnplInformation={bnplInformation}
            canAddToCart={canAddToCart}
            copy={copy.panel}
            isAddingToCart={isAddingToCart}
            locale={locale}
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
            personalizationValidation={personalizationValidation}
            product={product}
            purchaseActionRef={purchaseActionRef}
            quantity={quantity}
            renderedAt={renderedAt}
            selectedOptions={selectedOptions}
            shareActions={shareActions}
            variant={selectedVariant}
          />
        </div>
      </div>

      <ProductStickyPurchaseActions
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
    </>
  );
}
