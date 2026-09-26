import "server-only";

import type { VariantAvailabilityById } from "@/features/products/types/product-availability.types";
import type { ProductVariant } from "@/features/products/types/product-details.types";

type ResolveVariantAvailabilityInput = {
  maxOrderQuantity: number;
  variants: readonly ProductVariant[];
  warehouseId: number;
};

export async function getResolvedVariantAvailability(
  input: ResolveVariantAvailabilityInput,
): Promise<VariantAvailabilityById> {
  return Object.fromEntries(
    input.variants.map((variant) => {
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
                  input.maxOrderQuantity,
                ),
              }
            : { status: "out_of_stock" as const },
      ];
    }),
  );
}
