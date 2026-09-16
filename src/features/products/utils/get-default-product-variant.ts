import type {
  ProductDetails,
  ProductVariant,
} from "@/features/products/types/product-details.types";

export function getDefaultProductVariant(
  product: Pick<ProductDetails, "defaultVariantId" | "id" | "variants">,
): ProductVariant {
  const variant = product.variants.find(
    (candidate) => candidate.id === product.defaultVariantId,
  );

  if (!variant) {
    throw new Error(
      `Product "${product.id}" has an invalid default variant "${product.defaultVariantId}".`,
    );
  }

  return variant;
}
