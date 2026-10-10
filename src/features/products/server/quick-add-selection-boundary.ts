import "server-only";

import type { Locale } from "next-intl";

import { resolveLocationByCityId } from "@/features/location/api/location-api.server";
import { readGuestCityId } from "@/features/location/server/guest-city-session";
import { getResolvedVariantAvailability } from "@/features/products/server/product-availability-boundary";
import { getProductDetailsBySlug } from "@/features/products/server/product-boundary";
import type { QuickAddSelectionResponse } from "@/features/products/types/quick-add-selection.types";
import {
  assertProductConfiguration,
  ProductConfigurationError,
} from "@/features/products/utils/assert-product-configuration";
import {
  assertExpectedQuickAddCity,
  getRevalidatedQuickAddJourney,
  projectQuickAddSelectionData,
} from "@/features/products/utils/quick-add-selection";
import { getPublicSettings } from "@/features/settings/server/public-settings-boundary";

export class QuickAddSelectionError extends Error {
  constructor(
    readonly code:
      | "location-required"
      | "city-context-changed"
      | "product-unavailable"
      | "product-configuration-invalid",
  ) {
    super(code);
    this.name = "QuickAddSelectionError";
  }
}

export async function getQuickAddSelectionData({
  expectedCityId,
  locale,
  slug,
}: {
  expectedCityId: number;
  locale: Locale;
  slug: string;
}): Promise<QuickAddSelectionResponse> {
  const durableCityId = await readGuestCityId();
  const cityAssertion = assertExpectedQuickAddCity(
    expectedCityId,
    durableCityId,
  );
  if (cityAssertion !== "ok") {
    throw new QuickAddSelectionError(cityAssertion);
  }
  if (durableCityId === null) {
    throw new QuickAddSelectionError("location-required");
  }

  const product = await getProductDetailsBySlug(slug, locale, durableCityId);
  if (!product) throw new QuickAddSelectionError("product-unavailable");
  try {
    assertProductConfiguration(product);
  } catch (error) {
    if (
      error instanceof ProductConfigurationError &&
      error.code === "ambiguous-variant-combination"
    ) {
      throw new QuickAddSelectionError("product-configuration-invalid");
    }
    throw error;
  }
  const journey = getRevalidatedQuickAddJourney(
    product.personalization.enabled,
    product.variants.length,
  );
  if (journey === "customize") {
    return { kind: "journey-changed", journey: "customize" };
  }
  if (journey === "unavailable") {
    throw new QuickAddSelectionError("product-unavailable");
  }
  if (journey === "direct") {
    return { kind: "journey-changed", journey: "direct" };
  }

  const [location, settings] = await Promise.all([
    resolveLocationByCityId(durableCityId, locale),
    getPublicSettings(),
  ]);

  const availabilityByVariantId =
    location.inCoverage && location.warehouseId !== null
      ? await getResolvedVariantAvailability({
          maxOrderQuantity: settings.maxCartItemQuantity,
          variants: product.variants,
          warehouseId: location.warehouseId,
        })
      : Object.fromEntries(
          product.variants.map((variant) => [
            variant.id,
            { status: "unavailable_at_location" as const },
          ]),
        );

  return {
    kind: "selection",
    data: projectQuickAddSelectionData(
      product,
      location.city,
      availabilityByVariantId,
    ),
  };
}
