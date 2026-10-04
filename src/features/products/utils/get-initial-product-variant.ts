import type {
  ProductDetails,
  ProductVariant,
} from "@/features/products/types/product-details.types";

export function getInitialProductVariant(
  product: Pick<ProductDetails, "variants">,
): ProductVariant | null {
  return product.variants[0] ?? null;
}
