import type {
  EnabledProductPersonalizationConfig,
  PersonalizationCharacterPolicy,
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
    }
  | {
      code: "invalid-characters";
      characterPolicy: PersonalizationCharacterPolicy;
    }
  | {
      code: "language-script-mismatch";
      language: PersonalizationLanguage;
    };

export type ProductPersonalizationValidationResult =
  | { valid: true }
  | { valid: false; error: ProductPersonalizationValidationError };

const LETTERS_AND_SPACES_PATTERN = /^[\p{L}\p{M}\p{Zs}]+$/u;
const LETTER_PATTERN = /\p{L}/u;

const LANGUAGE_SCRIPT_PATTERNS: Readonly<
  Record<PersonalizationLanguage, RegExp>
> = {
  arabic: /^[\p{Script=Arabic}\p{M}\p{Zs}]+$/u,
  english: /^[\p{Script=Latin}\p{M}\p{Zs}]+$/u,
};

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

  if (
    config.characterPolicy === "letters-and-spaces" &&
    (!LETTERS_AND_SPACES_PATTERN.test(input.text) ||
      !LETTER_PATTERN.test(input.text))
  ) {
    return {
      valid: false,
      error: {
        code: "invalid-characters",
        characterPolicy: config.characterPolicy,
      },
    };
  }

  // Combining marks are accepted with the selected script; this deliberately
  // avoids attempting a universal grapheme or transliteration engine.
  if (!LANGUAGE_SCRIPT_PATTERNS[input.language].test(input.text)) {
    return {
      valid: false,
      error: { code: "language-script-mismatch", language: input.language },
    };
  }

  return { valid: true };
}
