import "server-only";

import { serverEnv } from "@/config/server-env";
import { getResolvedVariantAvailability } from "@/features/products/server/product-availability-boundary";
import {
  getMockComplementaryProductCandidates,
  getMockRelatedProducts,
  selectMockComplementaryProducts,
} from "@/features/products/server/mock-product-catalog";
import type { ListingProduct } from "@/features/products/types/product-listing.types";

function assertProductDiscoverySourceAvailable() {
  if (!serverEnv.useMockApi || process.env.NODE_ENV === "production") {
    throw new Error("The Product discovery API contract is not configured.");
  }
}

export async function getRelatedProducts({
  categoryId,
  currentProductId,
  limit = 6,
}: {
  categoryId: string;
  currentProductId: string;
  limit?: number;
}): Promise<readonly ListingProduct[]> {
  assertProductDiscoverySourceAvailable();
  return getMockRelatedProducts(categoryId, currentProductId, limit);
}

export async function getComplementaryProducts({
  currentProductId,
  locationId,
  limit = 6,
}: {
  currentProductId: string;
  locationId: string | null;
  limit?: number;
}): Promise<readonly ListingProduct[]> {
  assertProductDiscoverySourceAvailable();
  if (!locationId) return [];

  const candidates = getMockComplementaryProductCandidates(currentProductId);
  const availabilityByVariantId = await getResolvedVariantAvailability({
    locationId,
    variants: candidates.flatMap((candidate) => candidate.variants),
  });
  const eligibleProducts = candidates
    .filter((candidate) =>
      candidate.variants.some(
        (variant) =>
          availabilityByVariantId[variant.id]?.status === "available",
      ),
    )
    .map((candidate) => candidate.listingProduct);

  return selectMockComplementaryProducts(
    eligibleProducts,
    currentProductId,
    locationId,
    limit,
  );
}
