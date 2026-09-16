import "server-only";

import type { VariantAvailabilityById } from "@/features/products/types/product-availability.types";
import type { ProductVariant } from "@/features/products/types/product-details.types";

const showcaseAvailabilityByLocation: Readonly<
  Record<string, VariantAvailabilityById>
> = {
  riyadh: {
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
