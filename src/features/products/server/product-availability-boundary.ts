import "server-only";

import { serverEnv } from "@/config/server-env";
import { getMockVariantAvailability } from "@/features/products/server/mock-product-availability";
import type { VariantAvailabilityById } from "@/features/products/types/product-availability.types";
import type { ProductVariant } from "@/features/products/types/product-details.types";

function assertAvailabilitySourceAvailable() {
  if (!serverEnv.useMockApi || process.env.NODE_ENV === "production") {
    throw new Error("The Product availability API contract is not configured.");
  }
}

export async function getResolvedVariantAvailability({
  locationId,
  variants,
}: {
  locationId: string | null;
  variants: readonly ProductVariant[];
}): Promise<VariantAvailabilityById> {
  assertAvailabilitySourceAvailable();
  return getMockVariantAvailability(variants, locationId);
}
