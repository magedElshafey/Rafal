import type { ProductVariant } from "@/features/products/types/product-details.types";
import { getVariantAttributeEntries } from "@/lib/variant-attributes";

export type SelectedProductOptions = Readonly<Record<string, string>>;

export function getSelectedOptionsFromVariant(
  variant: ProductVariant,
): SelectedProductOptions {
  return { ...variant.attributes };
}

export function resolveProductVariant(
  variants: readonly ProductVariant[],
  selectedOptions: SelectedProductOptions,
): ProductVariant | null {
  const selectedEntries = Object.entries(selectedOptions);
  const matches = variants.filter((variant) => {
    const attributes = getVariantAttributeEntries(variant.attributes);
    return (
      attributes.length === selectedEntries.length &&
      attributes.every(([key, value]) => selectedOptions[key] === value)
    );
  });

  return matches.length === 1 ? matches[0]! : null;
}

export function isProductOptionValueAvailable(
  variants: readonly ProductVariant[],
  selectedOptions: SelectedProductOptions,
  optionId: string,
  valueId: string,
): boolean {
  const candidateSelection = { ...selectedOptions, [optionId]: valueId };
  const candidateEntries = Object.entries(candidateSelection);

  return variants.some((variant) =>
    candidateEntries.every(([key, value]) => variant.attributes[key] === value),
  );
}
