import "server-only";

import type { Locale } from "next-intl";

import { serverEnv } from "@/config/server-env";
import {
  createMockGuestCartSessionId,
  getMockGuestCartSessionId,
} from "@/features/cart/server/guest-cart-session";
import {
  addMockStoredCartLine,
  readMockStoredCart,
  type CartOwner,
  type StoredCart,
  type StoredCartLine,
} from "@/features/cart/server/mock-cart-repository";
import type {
  AddCartLineInput,
  AddCartLineResult,
  CartLine,
  CartSelectedOption,
  CartSnapshot,
} from "@/features/cart/types/cart.types";
import { getCurrentUser } from "@/features/auth/server/auth-boundary";
import { resolveCurrentLocation } from "@/features/location/server/resolve-current-location";
import { getResolvedVariantAvailability } from "@/features/products/server/product-availability-boundary";
import { getProductDetailsById } from "@/features/products/server/product-boundary";
import type {
  ProductDetails,
  ProductVariant,
} from "@/features/products/types/product-details.types";
import { assertProductConfiguration } from "@/features/products/utils/assert-product-configuration";
import { validateProductPersonalization } from "@/features/products/utils/validate-product-personalization";
import type { Money } from "@/types/money.types";

const CART_CURRENCY = "SAR" as const;

function assertCartSourceAvailable() {
  if (!serverEnv.useMockApi || process.env.NODE_ENV === "production") {
    throw new Error("The Cart API contract is not configured.");
  }
}

function money(amount: number): Money {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("The mock Cart contains invalid financial data.");
  }

  return { amount, currency: CART_CURRENCY };
}

function assertCompatibleMoney(value: Money) {
  if (
    value.currency !== CART_CURRENCY ||
    !Number.isFinite(value.amount) ||
    value.amount < 0
  ) {
    throw new Error("The mock Cart contains incompatible currency data.");
  }
}

function createEmptyCartSnapshot(): CartSnapshot {
  return {
    lines: [],
    summary: {
      lineCount: 0,
      totalQuantity: 0,
      subtotal: money(0),
      personalizationFees: money(0),
      total: money(0),
    },
  };
}

async function resolveCartOwner({
  createGuest,
}: {
  createGuest: boolean;
}): Promise<CartOwner | null> {
  const user = await getCurrentUser();
  if (user) return { kind: "customer", id: user.id };

  const currentSessionId = await getMockGuestCartSessionId();
  if (currentSessionId) return { kind: "guest", id: currentSessionId };
  if (!createGuest) return null;

  return {
    kind: "guest",
    id: await createMockGuestCartSessionId(),
  };
}

function getSelectedOptions(
  product: ProductDetails,
  variant: ProductVariant,
): readonly CartSelectedOption[] {
  return product.options.map((option) => {
    const selected = variant.optionValues.find(
      (candidate) => candidate.optionId === option.id,
    );
    const value = option.values.find(
      (candidate) => candidate.id === selected?.valueId,
    );

    if (!selected || !value) {
      throw new Error(
        `Product variant "${variant.id}" has invalid option configuration.`,
      );
    }

    return {
      optionId: option.id,
      optionName: option.name,
      valueId: value.id,
      valueLabel: value.label,
    };
  });
}

function validateStoredPersonalization(
  product: ProductDetails,
  line: StoredCartLine,
) {
  if (!product.personalization.enabled) {
    if (line.personalization !== null) {
      throw new Error("Stored Cart personalization is no longer supported.");
    }
    return;
  }

  if (!line.personalization) {
    throw new Error("Stored Cart personalization is missing.");
  }

  const result = validateProductPersonalization(
    product.personalization,
    line.personalization,
  );
  if (!result.valid) {
    throw new Error("Stored Cart personalization is no longer valid.");
  }
}

async function materializeStoredLine(
  line: StoredCartLine,
  locale: Locale,
  locationId: string | null,
): Promise<CartLine> {
  const product = await getProductDetailsById(line.productId, locale);
  if (!product) throw new Error("A stored Cart Product is unavailable.");

  assertProductConfiguration(product);
  const variant = product.variants.find(
    (candidate) => candidate.id === line.variantId,
  );
  if (!variant) throw new Error("A stored Cart variant is invalid.");

  validateStoredPersonalization(product, line);

  const availabilityByVariantId = await getResolvedVariantAvailability({
    locationId,
    variants: product.variants,
  });
  const availability = availabilityByVariantId[variant.id];
  if (!availability) {
    throw new Error("A stored Cart variant has no availability projection.");
  }

  const image =
    product.images.find((candidate) =>
      variant.imageIds.includes(candidate.id),
    ) ?? product.images[0];
  if (!image) throw new Error("A stored Cart Product has no valid image.");

  const unitPrice = variant.pricing.current;
  const personalizationFee = product.personalization.enabled
    ? product.personalization.additionalFee
    : null;
  assertCompatibleMoney(unitPrice);
  if (personalizationFee) assertCompatibleMoney(personalizationFee);

  const productAmount = unitPrice.amount * line.quantity;
  const personalizationAmount =
    (personalizationFee?.amount ?? 0) * line.quantity;

  return {
    id: line.lineId,
    product: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      image,
    },
    variant: {
      id: variant.id,
      sku: variant.sku,
      selectedOptions: getSelectedOptions(product, variant),
    },
    personalization: line.personalization,
    quantity: line.quantity,
    availability,
    unitPrice,
    personalizationFee,
    lineTotal: money(productAmount + personalizationAmount),
  };
}

async function materializeCartSnapshot(
  storedCart: StoredCart,
  locale: Locale,
): Promise<CartSnapshot> {
  if (storedCart.lines.length === 0) return createEmptyCartSnapshot();

  const location = await resolveCurrentLocation(locale);
  const lines = await Promise.all(
    storedCart.lines.map((line) =>
      materializeStoredLine(line, locale, location?.id ?? null),
    ),
  );

  const summary = lines.reduce(
    (current, line) => {
      const productAmount = line.unitPrice.amount * line.quantity;
      const personalizationAmount =
        (line.personalizationFee?.amount ?? 0) * line.quantity;

      return {
        lineCount: current.lineCount + 1,
        totalQuantity: current.totalQuantity + line.quantity,
        subtotal: current.subtotal + productAmount,
        personalizationFees:
          current.personalizationFees + personalizationAmount,
      };
    },
    {
      lineCount: 0,
      totalQuantity: 0,
      subtotal: 0,
      personalizationFees: 0,
    },
  );

  return {
    lines,
    summary: {
      lineCount: summary.lineCount,
      totalQuantity: summary.totalQuantity,
      subtotal: money(summary.subtotal),
      personalizationFees: money(summary.personalizationFees),
      total: money(summary.subtotal + summary.personalizationFees),
    },
  };
}

export async function getCurrentCart(locale: Locale): Promise<CartSnapshot> {
  assertCartSourceAvailable();

  const owner = await resolveCartOwner({ createGuest: false });
  if (!owner) return createEmptyCartSnapshot();

  return materializeCartSnapshot(await readMockStoredCart(owner), locale);
}

export async function addLineToCurrentCart(
  input: AddCartLineInput,
  locale: Locale,
): Promise<AddCartLineResult> {
  assertCartSourceAvailable();

  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return { ok: false, error: { code: "invalid-input" } };
  }

  const product = await getProductDetailsById(input.productId, locale);
  if (!product) {
    return { ok: false, error: { code: "product-unavailable" } };
  }

  assertProductConfiguration(product);
  const variant = product.variants.find(
    (candidate) => candidate.id === input.variantId,
  );
  if (!variant) {
    return { ok: false, error: { code: "variant-invalid" } };
  }

  if (product.personalization.enabled) {
    if (!input.personalization) {
      return {
        ok: false,
        error: { code: "invalid-personalization", reason: "required" },
      };
    }

    const validation = validateProductPersonalization(
      product.personalization,
      input.personalization,
    );
    if (!validation.valid) {
      return {
        ok: false,
        error: {
          code: "invalid-personalization",
          reason: validation.error.code,
        },
      };
    }
  } else if (input.personalization !== undefined) {
    return { ok: false, error: { code: "invalid-input" } };
  }

  const location = await resolveCurrentLocation(locale);
  if (!location) {
    return { ok: false, error: { code: "location-required" } };
  }

  const availabilityByVariantId = await getResolvedVariantAvailability({
    locationId: location.id,
    variants: product.variants,
  });
  const availability = availabilityByVariantId[variant.id];
  if (!availability) {
    throw new Error("The selected variant has no availability projection.");
  }
  if (availability.status === "unavailable_at_location") {
    return { ok: false, error: { code: "unavailable-at-location" } };
  }
  if (availability.status === "out_of_stock") {
    return { ok: false, error: { code: "out-of-stock" } };
  }
  if (input.quantity > availability.maxOrderQuantity) {
    return {
      ok: false,
      error: {
        code: "quantity-limit-exceeded",
        maxOrderQuantity: availability.maxOrderQuantity,
      },
    };
  }

  const owner = await resolveCartOwner({ createGuest: true });
  if (!owner) throw new Error("A Cart owner could not be resolved.");

  const { cart, affectedLineId } = await addMockStoredCartLine(owner, {
    productId: product.id,
    variantId: variant.id,
    quantity: input.quantity,
    personalization: input.personalization ?? null,
  });

  return {
    ok: true,
    cart: await materializeCartSnapshot(cart, locale),
    affectedLineId,
  };
}
