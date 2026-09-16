import type { ProductDetails } from "@/features/products/types/product-details.types";
import { getDefaultProductVariant } from "@/features/products/utils/get-default-product-variant";

export function assertProductConfiguration(product: ProductDetails): void {
  const optionValuesByOptionId = new Map(
    product.options.map((option) => [
      option.id,
      new Set(option.values.map((value) => value.id)),
    ]),
  );
  const imageIds = new Set(product.images.map((image) => image.id));
  const combinations = new Set<string>();
  const variantIds = new Set<string>();

  if (optionValuesByOptionId.size !== product.options.length) {
    throw new Error(`Product "${product.id}" contains duplicate option IDs.`);
  }
  if (imageIds.size !== product.images.length) {
    throw new Error(`Product "${product.id}" contains duplicate image IDs.`);
  }
  for (const option of product.options) {
    if (optionValuesByOptionId.get(option.id)?.size !== option.values.length) {
      throw new Error(
        `Product option "${option.id}" contains duplicate value IDs.`,
      );
    }
  }

  getDefaultProductVariant(product);

  for (const variant of product.variants) {
    if (variantIds.has(variant.id)) {
      throw new Error(
        `Product "${product.id}" contains duplicate variant ID "${variant.id}".`,
      );
    }
    variantIds.add(variant.id);

    if (variant.optionValues.length !== product.options.length) {
      throw new Error(
        `Product variant "${variant.id}" does not configure every Product option.`,
      );
    }

    const configuredOptionIds = new Set<string>();
    for (const { optionId, valueId } of variant.optionValues) {
      if (configuredOptionIds.has(optionId)) {
        throw new Error(
          `Product variant "${variant.id}" configures option "${optionId}" more than once.`,
        );
      }
      configuredOptionIds.add(optionId);

      const values = optionValuesByOptionId.get(optionId);
      if (!values) {
        throw new Error(
          `Product variant "${variant.id}" references unknown option "${optionId}".`,
        );
      }
      if (!values.has(valueId)) {
        throw new Error(
          `Product variant "${variant.id}" references unknown value "${valueId}" for option "${optionId}".`,
        );
      }
    }

    for (const option of product.options) {
      if (!configuredOptionIds.has(option.id)) {
        throw new Error(
          `Product variant "${variant.id}" does not configure option "${option.id}".`,
        );
      }
    }

    if (
      variant.imageIds.length === 0 ||
      variant.imageIds.some((imageId) => !imageIds.has(imageId))
    ) {
      throw new Error(
        `Product variant "${variant.id}" must reference valid Product images.`,
      );
    }

    const combination = [...variant.optionValues]
      .sort((left, right) => left.optionId.localeCompare(right.optionId))
      .map(({ optionId, valueId }) => `${optionId}:${valueId}`)
      .join("|");
    if (combinations.has(combination)) {
      throw new Error(
        `Product "${product.id}" contains duplicate variant option combinations.`,
      );
    }
    combinations.add(combination);
  }
}
