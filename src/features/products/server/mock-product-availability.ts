import "server-only";

import { getMockVariantTransportId } from "@/features/products/data/mock-product-contract";
import type { VariantAvailabilityById } from "@/features/products/types/product-availability.types";
import type { ProductVariant } from "@/features/products/types/product-details.types";

const showcaseAvailabilityByLocation: Readonly<
  Record<string, VariantAvailabilityById>
> = {
  // Synthetic development-only inventory. These quantities and states exist
  // solely to exercise location-aware storefront behavior in the mock adapter.
  riyadh: {
    [String(getMockVariantTransportId("women-jewelry-2"))]: {
      status: "available",
      maxOrderQuantity: 4,
    },
    [String(getMockVariantTransportId("women-jewelry-3"))]: {
      status: "available",
      maxOrderQuantity: 3,
    },
    [String(getMockVariantTransportId("women-jewelry-4"))]: {
      status: "available",
      maxOrderQuantity: 5,
    },
    [String(getMockVariantTransportId("women-jewelry-5"))]: {
      status: "available",
      maxOrderQuantity: 2,
    },
    [String(getMockVariantTransportId("women-jewelry-6"))]: {
      status: "available",
      maxOrderQuantity: 4,
    },
    [String(getMockVariantTransportId("women-jewelry-7"))]: {
      status: "available",
      maxOrderQuantity: 3,
    },
    [String(getMockVariantTransportId("women-jewelry-9"))]: { status: "unavailable_at_location" },
    [String(getMockVariantTransportId("women-jewelry-10"))]: {
      status: "available",
      maxOrderQuantity: 2,
    },
    [String(getMockVariantTransportId("personalized-gold-chain", "silver"))]: {
      status: "available",
      maxOrderQuantity: 5,
    },
    [String(getMockVariantTransportId("personalized-gold-chain", "gold"))]: {
      status: "available",
      maxOrderQuantity: 3,
    },
    [String(getMockVariantTransportId("personalized-gold-chain", "rose-gold"))]: {
      status: "out_of_stock",
    },
  },
  jeddah: {
    [String(getMockVariantTransportId("women-jewelry-2"))]: { status: "unavailable_at_location" },
    [String(getMockVariantTransportId("women-jewelry-3"))]: {
      status: "available",
      maxOrderQuantity: 2,
    },
    [String(getMockVariantTransportId("women-jewelry-4"))]: {
      status: "available",
      maxOrderQuantity: 4,
    },
    [String(getMockVariantTransportId("women-jewelry-5"))]: {
      status: "available",
      maxOrderQuantity: 3,
    },
    [String(getMockVariantTransportId("women-jewelry-6"))]: {
      status: "available",
      maxOrderQuantity: 2,
    },
    [String(getMockVariantTransportId("women-jewelry-7"))]: {
      status: "available",
      maxOrderQuantity: 5,
    },
    [String(getMockVariantTransportId("women-jewelry-9"))]: {
      status: "available",
      maxOrderQuantity: 3,
    },
    [String(getMockVariantTransportId("women-jewelry-10"))]: { status: "out_of_stock" },
    [String(getMockVariantTransportId("personalized-gold-chain", "silver"))]: {
      status: "available",
      maxOrderQuantity: 2,
    },
    [String(getMockVariantTransportId("personalized-gold-chain", "gold"))]: {
      status: "unavailable_at_location",
    },
    [String(getMockVariantTransportId("personalized-gold-chain", "rose-gold"))]: {
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
