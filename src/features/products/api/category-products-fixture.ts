import type { Locale } from "next-intl";

import type { MockListingProductSource } from "@/features/products/api/mock-product-listing";
import { mockCategoryProductRecords } from "@/features/products/data/mock-product-catalog";
import { createMockProductPayload } from "@/features/products/data/mock-product-contract";

export const categoryProductSubcategoriesFixture = [
  {
    value: "rings",
    label: { ar: "خواتم", en: "Rings" },
    keywords: { ar: ["خاتم", "خواتم"], en: ["ring", "rings"] },
  },
  {
    value: "bracelets",
    label: { ar: "أساور", en: "Bracelets" },
    keywords: { ar: ["سوار", "أساور"], en: ["bracelet", "bracelets"] },
  },
  {
    value: "necklaces",
    label: { ar: "قلائد", en: "Necklaces" },
    keywords: { ar: ["قلادة", "قلائد"], en: ["necklace", "necklaces"] },
  },
  {
    value: "earrings",
    label: { ar: "أقراط", en: "Earrings" },
    keywords: { ar: ["قرط", "أقراط"], en: ["earring", "earrings"] },
  },
] as const;

export function getCategoryProductSources(
  locale: Locale,
): readonly MockListingProductSource[] {
  return mockCategoryProductRecords.map(({ listing, product }) => ({
    payload: createMockProductPayload(product, locale, {
      badge: listing.badge,
      inStock: listing.inStock,
      timesOrdered: listing.salesCount,
    }),
    compatibility: {
      badge: listing.badge,
      createdOrder: listing.createdOrder,
      subcategory: listing.subcategory,
    },
  }));
}
