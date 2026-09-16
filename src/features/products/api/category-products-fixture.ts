import { mockCategoryProductRecords } from "@/features/products/data/mock-product-catalog";
import { toListingProduct } from "@/features/products/data/product-projections";
import type { ListingProduct } from "@/features/products/types/product-listing.types";

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

export const categoryProductsFixture: readonly ListingProduct[] =
  mockCategoryProductRecords.map(({ listing, product }) =>
    toListingProduct(product, listing),
  );
