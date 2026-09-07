type MockProductRecord = {
  id: string;
  names: Record<"ar" | "en", string>;
  keywords: Record<"ar" | "en", readonly string[]>;
  thumbnailSrc: string;
  price: {
    amount: number;
    currency: "SAR";
  };
};

export const MOCK_SEARCH_PRODUCTS: readonly MockProductRecord[] = [
  {
    id: "silver-name-necklace",
    names: { ar: "سلسلة فضة بالاسم", en: "Silver name necklace" },
    keywords: { ar: ["سلسلة", "فضة", "اسم"], en: ["silver", "name", "necklace"] },
    thumbnailSrc: "/ds-product-preview.svg",
    price: { amount: 150, currency: "SAR" },
  },
  {
    id: "mens-bracelet",
    names: { ar: "سوار رجالي", en: "Men's bracelet" },
    keywords: { ar: ["سوار", "رجالي"], en: ["men", "bracelet"] },
    thumbnailSrc: "/ds-product-preview.svg",
    price: { amount: 120, currency: "SAR" },
  },
  {
    id: "personalized-incense-burner",
    names: { ar: "مبخرة شخصية", en: "Personalized incense burner" },
    keywords: { ar: ["مبخرة", "شخصية", "هدية"], en: ["personalized", "incense", "gift"] },
    thumbnailSrc: "/ds-product-preview.svg",
    price: { amount: 185, currency: "SAR" },
  },
  {
    id: "graduation-gift",
    names: { ar: "هدية تخرج", en: "Graduation gift" },
    keywords: { ar: ["هدية", "تخرج"], en: ["graduation", "gift"] },
    thumbnailSrc: "/ds-product-preview.svg",
    price: { amount: 210, currency: "SAR" },
  },
] as const;
