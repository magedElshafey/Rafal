import { mockStorefrontProductRecords } from "@/features/products/data/mock-product-catalog";
import { toStorefrontProduct } from "@/features/products/data/product-projections";

const products = mockStorefrontProductRecords.map(({ product, storefront }) =>
  toStorefrontProduct(product, storefront),
);

export const bestSellerProducts = products;

export const latestProducts = [
  products[3],
  products[5],
  products[2],
  products[0],
  products[1],
  products[4],
];

export const featuredProducts = [
  products[1],
  products[4],
  products[0],
  products[2],
  products[5],
  products[3],
];
