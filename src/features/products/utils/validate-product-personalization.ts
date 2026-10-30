import type {
  EnabledProductPersonalizationConfig,
  PersonalizationLanguage,
  ProductPersonalizationInput,
} from "@/features/products/types/product-details.types";

export type ProductPersonalizationValidationError =
  | { code: "required" }
  | {
      code: "unsupported-language";
      language: PersonalizationLanguage;
    }
  | {
      code: "too-long";
      actualLength: number;
      maxLength: number;
    };

export type ProductPersonalizationValidationResult =
  | { valid: true }
  | { valid: false; error: ProductPersonalizationValidationError };

export function validateProductPersonalization(
  config: EnabledProductPersonalizationConfig,
  input: ProductPersonalizationInput,
): ProductPersonalizationValidationResult {
  if (input.text.trim().length === 0) {
    return { valid: false, error: { code: "required" } };
  }

  if (!config.allowedLanguages.includes(input.language)) {
    return {
      valid: false,
      error: { code: "unsupported-language", language: input.language },
    };
  }

  if (input.text.length > config.maxLength) {
    return {
      valid: false,
      error: {
        code: "too-long",
        actualLength: input.text.length,
        maxLength: config.maxLength,
      },
    };
  }

  return { valid: true };
}
