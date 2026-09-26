import "server-only";

import { serverEnv } from "@/config/server-env";
import { getMockVariantAvailability } from "@/features/products/server/mock-product-availability";
import type { VariantAvailabilityById } from "@/features/products/types/product-availability.types";
import type { ProductVariant } from "@/features/products/types/product-details.types";

type ResolveVariantAvailabilityInput =
  | {
      maxOrderQuantity: number;
      source: "laravel";
      variants: readonly ProductVariant[];
      warehouseId: number;
    }
  | {
      locationId: string | null;
      source: "mock";
      variants: readonly ProductVariant[];
    };

function assertAvailabilitySourceAvailable() {
  if (!serverEnv.useMockApi || process.env.NODE_ENV === "production") {
    throw new Error("The Product availability API contract is not configured.");
  }
}

export async function getResolvedVariantAvailability(
  input: ResolveVariantAvailabilityInput,
): Promise<VariantAvailabilityById> {
  if (input.source === "laravel") {
    return Object.fromEntries(
      input.variants.map((variant) => {
        const stock = variant.warehouseStocks.find(
          (candidate) => candidate.warehouseId === input.warehouseId,
        );

        return [
          variant.id,
          !stock
            ? { status: "unavailable_at_location" as const }
            : stock.quantity > 0
              ? {
                  status: "available" as const,
                  maxOrderQuantity: input.maxOrderQuantity,
                }
              : { status: "out_of_stock" as const },
        ];
      }),
    );
  }

  assertAvailabilitySourceAvailable();
  return getMockVariantAvailability(input.variants, input.locationId);
}
