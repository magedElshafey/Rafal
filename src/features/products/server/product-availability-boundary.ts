import "server-only";

import type { VariantAvailabilityById } from "@/features/products/types/product-availability.types";
import type { ProductVariant } from "@/features/products/types/product-details.types";
import { analyzeProductConfiguration, type ProductConfigurationAnalysis } from "@/features/products/utils/assert-product-configuration";

type ResolveVariantAvailabilityInput = {
  configuration?: ProductConfigurationAnalysis;
  maxOrderQuantity?: number;
  variants: readonly ProductVariant[];
  warehouseId: number;
};

export async function getResolvedVariantAvailability(
  input: ResolveVariantAvailabilityInput,
): Promise<VariantAvailabilityById> {
  const configuration = input.configuration ?? analyzeProductConfiguration(input);
  const unsafeIds = new Set(configuration.issues.flatMap((issue) => issue.variantIds));
  return Object.fromEntries(
    input.variants.map((variant) => {
      if (unsafeIds.has(variant.id)) {
        return [variant.id, { status: "purchase_unavailable" as const }];
      }
      const stock = variant.warehouseStocks.find(
        (candidate) => candidate.warehouseId === input.warehouseId,
      );

      return [
        variant.id,
        !stock
          ? { status: "out_of_stock" as const }
          : stock.quantity > 0
            ? {
                status: "available" as const,
                maxOrderQuantity: Math.min(
                  stock.quantity,
                  input.maxOrderQuantity ?? stock.quantity,
                ),
              }
            : { status: "out_of_stock" as const },
      ];
    }),
  );
}
