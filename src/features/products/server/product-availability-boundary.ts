import "server-only";

import { serverEnv } from "@/config/server-env";
import { getMockVariantAvailability } from "@/features/products/server/mock-product-availability";
import type { VariantAvailabilityById } from "@/features/products/types/product-availability.types";
import type { ProductVariant } from "@/features/products/types/product-details.types";

type ResolveVariantAvailabilityInput =
  | {
      hasAuthoritativeStockContext: boolean;
      maxOrderQuantity: number;
      source: "laravel";
      variants: readonly ProductVariant[];
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
      input.variants.map((variant) => [
        variant.id,
        !input.hasAuthoritativeStockContext
          ? { status: "purchase_unavailable" as const }
          : variant.inStock
            ? { status: "available" as const, maxOrderQuantity: input.maxOrderQuantity }
            : { status: "out_of_stock" as const },
      ]),
    );
  }

  assertAvailabilitySourceAvailable();
  return getMockVariantAvailability(input.variants, input.locationId);
}
