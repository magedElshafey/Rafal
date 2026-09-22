import type {
  ProductDetails,
  ProductVariant,
} from "@/features/products/types/product-details.types";

export function getInitialProductVariant(
  product: Pick<ProductDetails, "id" | "variants">,
): ProductVariant {
  const [variant] = product.variants;

  if (!variant) {
    throw new Error(`Product "${product.id}" has no sellable variant.`);
  }

  return variant;
}
