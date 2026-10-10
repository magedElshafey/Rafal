import type { ProductVariant } from "@/features/products/types/product-details.types";
import type { VariantAttributes } from "@/lib/variant-attributes";
import { resolveUniqueVariantByAttributes } from "@/features/products/utils/variant-combination";

export type SelectedProductOptions = Readonly<Record<string, string>>;

type VariantWithAttributes = {
  attributes: VariantAttributes;
};

export function getSelectedOptionsFromVariant(
  variant: Pick<ProductVariant, "attributes">,
): SelectedProductOptions {
  return { ...variant.attributes };
}

export function resolveProductVariant<TVariant extends VariantWithAttributes>(
  variants: readonly TVariant[],
  selectedOptions: SelectedProductOptions,
): TVariant | null {
  return resolveUniqueVariantByAttributes(variants, selectedOptions);
}

export function isProductOptionValueAvailable(
  variants: readonly VariantWithAttributes[],
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
