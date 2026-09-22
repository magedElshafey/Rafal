import type { Locale } from "next-intl";

import type { OfferProductRecord } from "@/features/offers/types/offers.types";
import { mockCategoryProductRecords } from "@/features/products/data/mock-product-catalog";
import { createMockProductPayload } from "@/features/products/data/mock-product-contract";
import type { StorefrontProductBadge } from "@/features/products/types/storefront-product.types";

function getOfferBadge(offerIndex: number): StorefrontProductBadge | undefined {
  if (offerIndex === 0) return "new";
  if (offerIndex === 1) return "personalization";
  if (offerIndex === 3) return "discount";
  return undefined;
}

function createDiscountedPricing(
  currentPrice: string,
  percentage: 20 | 30,
) {
  const originalPrice = String(
    Math.round(Number(currentPrice) / (1 - percentage / 100)),
  );

  return {
    effectivePrice: originalPrice,
    effectivePriceInclVat: originalPrice,
    discountedPrice: currentPrice,
    discountedPriceInclVat: currentPrice,
    discountPercentage: percentage,
    discountEndAt: null,
  };
}

export function getOffersProductRecords(
  locale: Locale,
): readonly OfferProductRecord[] {
  return mockCategoryProductRecords.map(({ listing, product }, index) => {
    const offerIndex = index % 4;
    const offers: OfferProductRecord["offers"] = [
      offerIndex === 0
        ? "new"
        : offerIndex === 1
          ? "personalized-discounts"
          : offerIndex === 2
            ? "weekend"
            : "up-to-30",
    ];
    const badge = getOfferBadge(offerIndex);
    const currentPrice =
      product.pricing.discountedPriceInclVat ??
      product.pricing.effectivePriceInclVat;
    const pricing =
      offerIndex === 1
        ? createDiscountedPricing(currentPrice, 20)
        : offerIndex === 3
          ? createDiscountedPricing(currentPrice, 30)
          : product.pricing;

    return {
      offers,
      source: {
        payload: createMockProductPayload(product, locale, {
          badge,
          inStock: listing.inStock,
          pricing,
          timesOrdered: listing.salesCount,
        }),
        compatibility: {
          badge,
          createdOrder: listing.createdOrder,
          subcategory: listing.subcategory,
        },
      },
    };
  });
}
