import { categoryProductsFixture } from "@/features/products/api/category-products-fixture";
import type { OfferProductRecord } from "@/features/offers/types/offers.types";

export const offersProductsFixture: readonly OfferProductRecord[] =
  categoryProductsFixture.map((product, index) => {
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
    const offerProduct =
      offerIndex === 0
        ? { ...product, badge: "new" as const }
        : offerIndex === 1
          ? {
              ...product,
              badge: "personalization" as const,
              originalPrice: Math.round(product.price / 0.8),
              personalizable: true,
            }
          : offerIndex === 3
            ? {
                ...product,
                badge: "discount" as const,
                originalPrice: Math.round(product.price / 0.7),
              }
            : product;

    return { offers, product: offerProduct };
  });
