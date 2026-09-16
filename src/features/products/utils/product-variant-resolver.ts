import type {
  ProductOption,
  ProductVariant,
} from "@/features/products/types/product-details.types";

export type SelectedProductOptions = Readonly<Record<string, string>>;

export function getSelectedOptionsFromVariant(
  variant: ProductVariant,
): SelectedProductOptions {
  return Object.fromEntries(
    variant.optionValues.map(({ optionId, valueId }) => [optionId, valueId]),
  );
}

export function resolveProductVariant(
  options: readonly ProductOption[],
  variants: readonly ProductVariant[],
  selectedOptions: SelectedProductOptions,
): ProductVariant | null {
  if (
    options.some((option) => selectedOptions[option.id] === undefined) ||
    Object.keys(selectedOptions).length !== options.length
  ) {
    return null;
  }

  return (
    variants.find(
      (variant) =>
        variant.optionValues.length === options.length &&
        variant.optionValues.every(
          ({ optionId, valueId }) => selectedOptions[optionId] === valueId,
        ),
    ) ?? null
  );
}
