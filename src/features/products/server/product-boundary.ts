import "server-only";

import type { Locale } from "next-intl";

import { serverEnv } from "@/config/server-env";
import { getMockProductDetailsBySlug } from "@/features/products/server/mock-product-catalog";
import type { ProductDetails } from "@/features/products/types/product-details.types";

function assertProductSourceAvailable() {
  if (!serverEnv.useMockApi || process.env.NODE_ENV === "production") {
    throw new Error("The Product Details API contract is not configured.");
  }
}

export async function getProductDetailsBySlug(
  slug: string,
  locale: Locale,
): Promise<ProductDetails | null> {
  assertProductSourceAvailable();
  return getMockProductDetailsBySlug(slug, locale);
}
