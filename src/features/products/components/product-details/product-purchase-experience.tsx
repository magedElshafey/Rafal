"use client";

import type { Locale } from "next-intl";
import { useEffect, useState } from "react";

import { ProductGallery } from "@/features/products/components/product-details/product-gallery";
import {
  ProductPurchasePanel,
  type ProductPurchasePanelCopy,
} from "@/features/products/components/product-details/product-purchase-panel";
import type { VariantAvailabilityById } from "@/features/products/types/product-availability.types";
import type {
  PersonalizationLanguage,
  ProductDetails,
  ProductPersonalizationInput,
  ProductVariant,
} from "@/features/products/types/product-details.types";
import { getDefaultProductVariant } from "@/features/products/utils/get-default-product-variant";
import {
  getSelectedOptionsFromVariant,
  resolveProductVariant,
} from "@/features/products/utils/product-variant-resolver";
import { validateProductPersonalization } from "@/features/products/utils/validate-product-personalization";

export type ProductPurchaseData = Pick<
  ProductDetails,
  | "defaultVariantId"
  | "id"
  | "images"
  | "name"
  | "options"
  | "personalization"
  | "ratingSummary"
  | "variants"
>;

export type ProductPurchaseExperienceCopy = {
  gallery: {
    selectImageTemplate: string;
  };
  panel: ProductPurchasePanelCopy;
};

type ProductPurchaseExperienceProps = {
  availabilityByVariantId: VariantAvailabilityById;
  copy: ProductPurchaseExperienceCopy;
  locale: Locale;
  product: ProductPurchaseData;
  renderedAt: number;
};

function getPreferredImageId(
  product: ProductPurchaseData,
  variant: ProductVariant,
): string {
  const imageId = variant.imageIds.find((candidate) =>
    product.images.some((image) => image.id === candidate),
  );

  if (!imageId) {
    throw new Error(
      `Product variant "${variant.id}" does not reference a valid preferred image.`,
    );
  }

  return imageId;
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

export function ProductPurchaseExperience({
  availabilityByVariantId,
  copy,
  locale,
  product,
  renderedAt,
}: ProductPurchaseExperienceProps) {
  const defaultVariant = getDefaultProductVariant(product);
  const initialImageId = getPreferredImageId(product, defaultVariant);
  const [selectedOptions, setSelectedOptions] = useState(() =>
    getSelectedOptionsFromVariant(defaultVariant),
  );
  const [selectedImageId, setSelectedImageId] = useState(() =>
    initialImageId,
  );
  const [quantity, setQuantity] = useState(1);
  const [personalizationInput, setPersonalizationInput] = useState(() =>
    getInitialPersonalizationInput(product),
  );
  const selectedVariant = resolveProductVariant(
    product.options,
    product.variants,
    selectedOptions,
  );
  const availability = selectedVariant
    ? availabilityByVariantId[selectedVariant.id]
    : undefined;
  const availabilityStatus = availability?.status;
  const maxOrderQuantity =
    availability?.status === "available"
      ? availability.maxOrderQuantity
      : 1;
  const personalizationValidation =
    product.personalization.enabled && personalizationInput
      ? validateProductPersonalization(
          product.personalization,
          personalizationInput,
        )
      : null;

  useEffect(() => {
    if (!availabilityStatus) return;

    const timeoutId = window.setTimeout(() => {
      setQuantity((currentQuantity) => {
        const nextQuantity =
          availabilityStatus === "available"
            ? Math.min(maxOrderQuantity, Math.max(1, currentQuantity))
            : 1;

        return nextQuantity === currentQuantity
          ? currentQuantity
          : nextQuantity;
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [availabilityStatus, maxOrderQuantity]);

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
    setQuantity((currentQuantity) =>
      nextAvailability.status === "available"
        ? Math.min(currentQuantity, nextAvailability.maxOrderQuantity)
        : 1,
    );
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

  return (
    <div className="mt-7 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12 rtl:lg:flex-row-reverse">
      <div className="min-w-0 lg:w-[44%]">
        <ProductGallery
          copy={copy.gallery}
          images={product.images}
          initialImageId={initialImageId}
          onSelectImage={setSelectedImageId}
          productId={product.id}
          productName={product.name}
          selectedImageId={selectedImageId}
        />
      </div>
      <div className="min-w-0 flex-1">
        <ProductPurchasePanel
          availability={availability}
          copy={copy.panel}
          locale={locale}
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
          quantity={quantity}
          renderedAt={renderedAt}
          selectedOptions={selectedOptions}
          variant={selectedVariant}
        />
      </div>
    </div>
  );
}
