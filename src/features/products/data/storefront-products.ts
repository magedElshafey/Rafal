import type { Locale } from "next-intl";

import {
  mapMockListingProducts,
  type MockListingProductSource,
} from "@/features/products/api/mock-product-listing";
import { mockStorefrontProductRecords } from "@/features/products/data/mock-product-catalog";
import { createMockProductPayload } from "@/features/products/data/mock-product-contract";
import type { StorefrontProduct } from "@/features/products/types/storefront-product.types";

function selectProducts(
  products: readonly StorefrontProduct[],
  indices: readonly number[],
): readonly StorefrontProduct[] {
  return indices.flatMap((index) => {
    const product = products[index];
    return product ? [product] : [];
  });
}

export function getStorefrontProductCollections(locale: Locale) {
  const categoryByProductId = new Map<string, StorefrontProduct["category"]>();
  const sources: MockListingProductSource[] =
    mockStorefrontProductRecords.map(({ product, storefront }, index) => {
      const payload = createMockProductPayload(product, locale, {
        badge: storefront.badge,
      });
      categoryByProductId.set(String(payload.id), storefront.category);

      return {
        payload,
        compatibility: {
          badge: storefront.badge,
          createdOrder: index + 1,
          subcategory: storefront.category,
        },
      };
    });
  const products = mapMockListingProducts(sources).flatMap((product) => {
    const category = categoryByProductId.get(product.id);
    return category ? [{ ...product, category }] : [];
  });

  return {
    bestSellerProducts: products,
    latestProducts: selectProducts(products, [3, 5, 2, 0, 1, 4]),
    featuredProducts: selectProducts(products, [1, 4, 0, 2, 5, 3]),
  };
}
