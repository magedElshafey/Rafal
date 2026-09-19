import "server-only";

import type { Locale } from "next-intl";
import { cache } from "react";

import { serverEnv } from "@/config/server-env";
import {
  getMockProductDetailsById,
  getMockProductDetailsBySlug,
} from "@/features/products/server/mock-product-catalog";
import type { ProductDetails } from "@/features/products/types/product-details.types";

function assertProductSourceAvailable() {
  if (!serverEnv.useMockApi || process.env.NODE_ENV === "production") {
    throw new Error("The Product Details API contract is not configured.");
  }
}

export const getProductDetailsBySlug = cache(async function getProductDetailsBySlug(
  slug: string,
  locale: Locale,
): Promise<ProductDetails | null> {
  assertProductSourceAvailable();
  return getMockProductDetailsBySlug(slug, locale);
});

export async function getProductDetailsById(
  productId: string,
  locale: Locale,
): Promise<ProductDetails | null> {
  assertProductSourceAvailable();
  return getMockProductDetailsById(productId, locale);
}
