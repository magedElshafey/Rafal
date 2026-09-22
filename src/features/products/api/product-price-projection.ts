import type { ProductVariantDto } from "@/features/products/api/product-dto";
import type { ProductVariantPricing } from "@/features/products/types/product-details.types";

export type ProductPricePresentation = {
  current: number;
  original: number | null;
  hasDiscount: boolean;
};

export function getVariantPricePresentation(
  variant: Pick<
    ProductVariantDto,
    "discounted_price_incl_vat" | "effective_price_incl_vat"
  >,
): ProductPricePresentation {
  const original = Number(variant.effective_price_incl_vat);
  const discounted =
    variant.discounted_price_incl_vat === null
      ? null
      : Number(variant.discounted_price_incl_vat);

  return {
    current: discounted ?? original,
    original: discounted === null ? null : original,
    hasDiscount: discounted !== null,
  };
}

export function selectLowestDisplayPriceVariant(
  variants: readonly ProductVariantDto[],
): ProductVariantDto | null {
  let selectedVariant: ProductVariantDto | null = null;
  let selectedPrice = Number.POSITIVE_INFINITY;

  for (const variant of variants) {
    const { current } = getVariantPricePresentation(variant);
    if (current < selectedPrice) {
      selectedVariant = variant;
      selectedPrice = current;
    }
  }

  return selectedVariant;
}

export function mapVariantPrice(
  variant: ProductVariantDto,
  discountPercentage: number | null,
  discountEndsAt: string | null,
): ProductVariantPricing {
  const price = getVariantPricePresentation(variant);
  return {
    current: { amount: price.current, currency: "SAR" },
    compareAt:
      price.original === null
        ? null
        : { amount: price.original, currency: "SAR" },
    promotion: price.hasDiscount
      ? { percentage: discountPercentage, endsAt: discountEndsAt }
      : null,
  };
}
