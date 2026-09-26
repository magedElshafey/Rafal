"use server";

import { hasLocale } from "next-intl";

import { mapCartActionError } from "@/features/cart/actions/cart-action-errors";
import { createCartAddDiagnostics } from "@/features/cart/server/cart-add-diagnostics";
import { addLineToCurrentCart } from "@/features/cart/server/cart-boundary";
import type {
  AddCartLineInput,
  AddCartLineResult,
} from "@/features/cart/types/cart.types";
import type { PersonalizationLanguage } from "@/features/products/types/product-details.types";
import { routing } from "@/i18n/routing";

const MAX_ID_LENGTH = 128;
const MAX_RAW_PERSONALIZATION_LENGTH = 1_024;
const MAX_RAW_QUANTITY = 10_000;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isPersonalizationLanguage(
  value: unknown,
): value is PersonalizationLanguage {
  return value === "arabic" || value === "english";
}

function parseInput(value: unknown): AddCartLineInput | null {
  if (
    !isPlainRecord(value) ||
    !hasOnlyKeys(value, [
      "productId",
      "variantId",
      "quantity",
      "personalization",
    ])
  ) {
    return null;
  }

  const productId =
    typeof value.productId === "string" ? value.productId.trim() : "";
  const variantId =
    typeof value.variantId === "string" ? value.variantId.trim() : "";
  if (
    productId.length === 0 ||
    productId.length > MAX_ID_LENGTH ||
    variantId.length === 0 ||
    variantId.length > MAX_ID_LENGTH ||
    typeof value.quantity !== "number" ||
    !Number.isFinite(value.quantity) ||
    !Number.isInteger(value.quantity) ||
    value.quantity <= 0 ||
    value.quantity > MAX_RAW_QUANTITY
  ) {
    return null;
  }

  if (value.personalization === undefined) {
    return { productId, variantId, quantity: value.quantity };
  }

  if (
    !isPlainRecord(value.personalization) ||
    !hasOnlyKeys(value.personalization, ["language", "text"]) ||
    !isPersonalizationLanguage(value.personalization.language) ||
    typeof value.personalization.text !== "string" ||
    value.personalization.text.length > MAX_RAW_PERSONALIZATION_LENGTH
  ) {
    return null;
  }

  return {
    productId,
    variantId,
    quantity: value.quantity,
    personalization: {
      language: value.personalization.language,
      text: value.personalization.text,
    },
  };
}

export async function addCartLine(
  input: unknown,
  locale: unknown,
): Promise<AddCartLineResult> {
  const parsedInput = parseInput(input);
  if (
    !parsedInput ||
    typeof locale !== "string" ||
    !hasLocale(routing.locales, locale)
  ) {
    return { ok: false, error: { code: "invalid-input" } };
  }

  const diagnostics = createCartAddDiagnostics();

  try {
    return await addLineToCurrentCart(parsedInput, locale, diagnostics);
  } catch (error) {
    diagnostics.failure(error);
    return { ok: false, error: mapCartActionError(error) };
  }
}
