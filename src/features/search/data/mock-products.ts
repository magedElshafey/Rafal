import type { Locale } from "next-intl";

import { mapMockListingProducts } from "@/features/products/api/mock-product-listing";
import { mockSearchProductRecords } from "@/features/products/data/mock-product-catalog";
import { createMockProductPayload } from "@/features/products/data/mock-product-contract";
import type { Money } from "@/types/money.types";

type MockSearchProduct = {
  id: string;
  keywords: readonly string[];
  name: string;
  price: Money;
  thumbnailSrc: string | null;
};

export function getMockSearchProducts(
  locale: Locale,
): readonly MockSearchProduct[] {
  const keywordsByProductId = new Map<string, readonly string[]>();
  const products = mapMockListingProducts(
    mockSearchProductRecords.map(({ keywords, product }, index) => {
      const payload = createMockProductPayload(product, locale);
      keywordsByProductId.set(String(payload.id), keywords[locale]);

      return {
        payload,
        compatibility: {
          createdOrder: index + 1,
          subcategory: product.primaryCategory.slug,
        },
      };
    }),
  );

  return products.map((product) => ({
    id: product.id,
    keywords: keywordsByProductId.get(product.id) ?? [],
    name: product.name,
    price: { amount: product.price, currency: "SAR" },
    thumbnailSrc: product.imageUrl,
  }));
}
