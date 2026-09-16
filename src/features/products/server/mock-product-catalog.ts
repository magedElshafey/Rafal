import "server-only";

import { categoryProductsFixture } from "@/features/products/api/category-products-fixture";
import { bestSellerProducts } from "@/features/products/data/storefront-products";
import type { ListingProduct } from "@/features/products/types/product-listing.types";

const storefrontListingProducts: readonly ListingProduct[] =
  bestSellerProducts.map((product, index) => ({
    badge: product.badge,
    createdOrder: index + 1,
    id: product.id,
    imageUrl: product.imageUrl,
    inStock: true,
    name: product.name,
    originalPrice: product.originalPrice,
    personalizable: product.badge === "personalization",
    price: product.price,
    rating: product.rating,
    salesCount: 0,
    slug: product.slug,
    subcategory: product.category,
  }));

const mockCatalogProducts = [
  ...categoryProductsFixture,
  ...storefrontListingProducts.filter(
    (storefrontProduct) =>
      !categoryProductsFixture.some(
        (listingProduct) => listingProduct.id === storefrontProduct.id,
      ),
  ),
];

const productsById = new Map(
  mockCatalogProducts.map((product) => [product.id, product]),
);

export const mockCatalogProductIds = mockCatalogProducts.map(
  (product) => product.id,
);

export function isKnownProductId(productId: string): boolean {
  return productsById.has(productId);
}

export function getListingProductById(
  productId: string,
): ListingProduct | undefined {
  return productsById.get(productId);
}
