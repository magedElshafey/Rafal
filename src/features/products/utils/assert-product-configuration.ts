import type { ProductDetails } from "@/features/products/types/product-details.types";
import { getInitialProductVariant } from "@/features/products/utils/get-initial-product-variant";

const SUPPORTED_PERSONALIZATION_LANGUAGES = new Set(["arabic", "english"]);

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

  if (product.personalization.enabled) {
    const {
      additionalFee,
      allowedLanguages,
      characterPolicy,
      maxLength,
    } = product.personalization;

    if (allowedLanguages.length === 0) {
      throw new Error(
        `Product "${product.id}" enables personalization without an allowed language.`,
      );
    }
    if (
      new Set(allowedLanguages).size !== allowedLanguages.length ||
      allowedLanguages.some(
        (language) => !SUPPORTED_PERSONALIZATION_LANGUAGES.has(language),
      )
    ) {
      throw new Error(
        `Product "${product.id}" contains an invalid personalization language configuration.`,
      );
    }
    if (!Number.isFinite(maxLength) || !Number.isInteger(maxLength) || maxLength <= 0) {
      throw new Error(
        `Product "${product.id}" personalization maxLength must be a positive finite integer.`,
      );
    }
    if (characterPolicy !== "letters-and-spaces") {
      throw new Error(
        `Product "${product.id}" contains an unknown personalization character policy.`,
      );
    }
    if (
      additionalFee !== null &&
      (!Number.isFinite(additionalFee.amount) ||
        additionalFee.amount < 0 ||
        additionalFee.currency !== "SAR")
    ) {
      throw new Error(
        `Product "${product.id}" contains an invalid personalization fee.`,
      );
    }
  }

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

  getInitialProductVariant(product);

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

    if (variant.imageIds.some((imageId) => !imageIds.has(imageId))) {
      throw new Error(
        `Product variant "${variant.id}" references an unknown Product image.`,
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
