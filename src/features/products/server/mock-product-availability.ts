import "server-only";

import type { VariantAvailabilityById } from "@/features/products/types/product-availability.types";
import type { ProductVariant } from "@/features/products/types/product-details.types";

const showcaseAvailabilityByLocation: Readonly<
  Record<string, VariantAvailabilityById>
> = {
  // Synthetic development-only inventory. These quantities and states exist
  // solely to exercise location-aware storefront behavior in the mock adapter.
  riyadh: {
    "women-jewelry-2-default": {
      status: "available",
      maxOrderQuantity: 4,
    },
    "women-jewelry-3-default": {
      status: "available",
      maxOrderQuantity: 3,
    },
    "women-jewelry-4-default": {
      status: "available",
      maxOrderQuantity: 5,
    },
    "women-jewelry-5-default": {
      status: "available",
      maxOrderQuantity: 2,
    },
    "women-jewelry-6-default": {
      status: "available",
      maxOrderQuantity: 4,
    },
    "women-jewelry-7-default": {
      status: "available",
      maxOrderQuantity: 3,
    },
    "women-jewelry-9-default": { status: "unavailable_at_location" },
    "women-jewelry-10-default": {
      status: "available",
      maxOrderQuantity: 2,
    },
    "personalized-gold-chain-silver": {
      status: "available",
      maxOrderQuantity: 5,
    },
    "personalized-gold-chain-gold": {
      status: "available",
      maxOrderQuantity: 3,
    },
    "personalized-gold-chain-rose-gold": { status: "out_of_stock" },
  },
  jeddah: {
    "women-jewelry-2-default": { status: "unavailable_at_location" },
    "women-jewelry-3-default": {
      status: "available",
      maxOrderQuantity: 2,
    },
    "women-jewelry-4-default": {
      status: "available",
      maxOrderQuantity: 4,
    },
    "women-jewelry-5-default": {
      status: "available",
      maxOrderQuantity: 3,
    },
    "women-jewelry-6-default": {
      status: "available",
      maxOrderQuantity: 2,
    },
    "women-jewelry-7-default": {
      status: "available",
      maxOrderQuantity: 5,
    },
    "women-jewelry-9-default": {
      status: "available",
      maxOrderQuantity: 3,
    },
    "women-jewelry-10-default": { status: "out_of_stock" },
    "personalized-gold-chain-silver": {
      status: "available",
      maxOrderQuantity: 2,
    },
    "personalized-gold-chain-gold": { status: "unavailable_at_location" },
    "personalized-gold-chain-rose-gold": {
      status: "available",
      maxOrderQuantity: 1,
    },
  },
};

export function getMockVariantAvailability(
  variants: readonly ProductVariant[],
  locationId: string | null,
): VariantAvailabilityById {
  return Object.fromEntries(
    variants.map((variant) => {
      if (!locationId) {
        return [variant.id, { status: "unavailable_at_location" }];
      }

      const configured =
        showcaseAvailabilityByLocation[locationId]?.[variant.id];

      return [
        variant.id,
        configured ?? { status: "unavailable_at_location" },
      ];
    }),
  );
}
