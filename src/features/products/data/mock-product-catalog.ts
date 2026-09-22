import type { Locale } from "next-intl";

import type {
  StorefrontProductBadge,
  StorefrontProductCategory,
} from "@/features/products/types/storefront-product.types";

type LocalizedText = Record<Locale, string>;

type MockProductCategory = {
  id: string;
  names: LocalizedText;
  slug: string;
  transportId: number;
};

export type MockProductCatalogRecord = {
  id: string;
  transportId: number;
  slug: string;
  names: LocalizedText;
  primaryCategory: MockProductCategory;
  primaryImage: {
    src: string;
  };
  pricing: {
    effectivePrice: string;
    effectivePriceInclVat: string;
    discountedPrice: string | null;
    discountedPriceInclVat: string | null;
    discountPercentage: number | null;
    discountEndAt: string | null;
  };
  personalizable: boolean;
};

type MockListingProjection = {
  badge?: StorefrontProductBadge;
  createdOrder: number;
  inStock: boolean;
  salesCount: number;
  subcategory: string;
};

type MockStorefrontProjection = {
  badge?: StorefrontProductBadge;
  category: StorefrontProductCategory;
};

const categories = {
  jewelry: {
    id: "womens-jewelry",
    slug: "womens-jewelry",
    transportId: 101,
    names: { ar: "مجوهرات نسائية", en: "Women's jewelry" },
  },
  perfumes: {
    id: "perfumes",
    slug: "perfumes",
    transportId: 102,
    names: { ar: "عطور", en: "Perfumes" },
  },
  personalized: {
    id: "personalized",
    slug: "personalized",
    transportId: 103,
    names: { ar: "منتجات مخصصة", en: "Personalized products" },
  },
  mensGifts: {
    id: "mens-gifts",
    slug: "mens-gifts",
    transportId: 104,
    names: { ar: "هدايا رجالية", en: "Men's gifts" },
  },
} as const satisfies Record<string, MockProductCategory>;

function assertUniqueCategoryIdentity(
  values: readonly MockProductCategory[],
): void {
  const authoringIds = new Set<string>();
  const transportIds = new Set<number>();

  for (const category of values) {
    if (authoringIds.has(category.id)) {
      throw new Error(`Duplicate mock Category ID "${category.id}".`);
    }
    if (transportIds.has(category.transportId)) {
      throw new Error(
        `Duplicate mock Category transport ID "${category.transportId}".`,
      );
    }

    authoringIds.add(category.id);
    transportIds.add(category.transportId);
  }
}

assertUniqueCategoryIdentity(Object.values(categories));

function createMockBackendPricing(
  currentAmount: number,
  originalAmount?: number,
  discountPercentage: number | null = null,
) {
  const current = String(currentAmount);
  const original = String(originalAmount ?? currentAmount);

  return {
    effectivePrice: original,
    effectivePriceInclVat: original,
    discountedPrice: originalAmount === undefined ? null : current,
    discountedPriceInclVat: originalAmount === undefined ? null : current,
    discountPercentage,
    discountEndAt: null,
  };
}

function createProduct({
  id,
  imageUrl,
  names,
  personalizable = false,
  price,
  discountPercentage = null,
  originalPrice,
  primaryCategory,
  slug = id,
  transportId,
}: {
  id: string;
  imageUrl: string;
  names: LocalizedText;
  personalizable?: boolean;
  price: number;
  discountPercentage?: number | null;
  originalPrice?: number;
  primaryCategory: MockProductCategory;
  slug?: string;
  transportId: number;
}): MockProductCatalogRecord {
  return {
    id,
    transportId,
    slug,
    names,
    primaryCategory,
    primaryImage: { src: imageUrl },
    pricing: createMockBackendPricing(
      price,
      originalPrice,
      discountPercentage,
    ),
    personalizable,
  };
}

const categoryImages = [
  "/images/home/heart-necklace.png",
  "/images/home/name-necklace.png",
] as const;

const categorySubcategories = [
  "rings",
  "bracelets",
  "necklaces",
  "earrings",
] as const;

const categoryProductIdentities = [
  { fixtureSequence: 1, id: "women-jewelry-1", transportId: 1001 },
  { fixtureSequence: 2, id: "women-jewelry-2", transportId: 1002 },
  { fixtureSequence: 3, id: "women-jewelry-3", transportId: 1003 },
  { fixtureSequence: 4, id: "women-jewelry-4", transportId: 1004 },
  { fixtureSequence: 5, id: "women-jewelry-5", transportId: 1005 },
  { fixtureSequence: 6, id: "women-jewelry-6", transportId: 1006 },
  { fixtureSequence: 7, id: "women-jewelry-7", transportId: 1007 },
  { fixtureSequence: 8, id: "women-jewelry-8", transportId: 1008 },
  { fixtureSequence: 9, id: "women-jewelry-9", transportId: 1009 },
  { fixtureSequence: 10, id: "women-jewelry-10", transportId: 1010 },
  { fixtureSequence: 11, id: "women-jewelry-11", transportId: 1011 },
  { fixtureSequence: 12, id: "women-jewelry-12", transportId: 1012 },
  { fixtureSequence: 13, id: "women-jewelry-13", transportId: 1013 },
  { fixtureSequence: 14, id: "women-jewelry-14", transportId: 1014 },
  { fixtureSequence: 15, id: "women-jewelry-15", transportId: 1015 },
  { fixtureSequence: 16, id: "women-jewelry-16", transportId: 1016 },
  { fixtureSequence: 17, id: "women-jewelry-17", transportId: 1017 },
  { fixtureSequence: 18, id: "women-jewelry-18", transportId: 1018 },
  { fixtureSequence: 19, id: "women-jewelry-19", transportId: 1019 },
  { fixtureSequence: 20, id: "women-jewelry-20", transportId: 1020 },
  { fixtureSequence: 21, id: "women-jewelry-21", transportId: 1021 },
  { fixtureSequence: 22, id: "women-jewelry-22", transportId: 1022 },
  { fixtureSequence: 23, id: "women-jewelry-23", transportId: 1023 },
  { fixtureSequence: 24, id: "women-jewelry-24", transportId: 1024 },
] as const;

export const mockCategoryProductRecords = categoryProductIdentities.map(
  ({ fixtureSequence, id, transportId }) => {
    const index = fixtureSequence - 1;
    const personalizable = index % 3 === 1;
    const discounted = index % 5 === 0;
    const price = 120 + (index % 6) * 15 + (index % 2 ? 0.5 : 0);
    const product = createProduct({
      id,
      transportId,
      slug: `silver-necklace-${fixtureSequence}`,
      names: {
        ar: personalizable ? "سلسال فضة بالاسم" : "قلادة فضة مرصعة",
        en: personalizable
          ? "Personalized silver necklace"
          : "Studded silver necklace",
      },
      imageUrl: categoryImages[index % categoryImages.length],
      personalizable,
      price,
      originalPrice: discounted ? price + 30 : undefined,
      primaryCategory: categories.jewelry,
    });
    const listing: MockListingProjection = {
      createdOrder: index + 1,
      inStock: index % 7 !== 0,
      salesCount: 120 - index * 3 + (index % 4) * 11,
      subcategory: categorySubcategories[index % categorySubcategories.length],
      badge: discounted
        ? "discount"
        : personalizable
          ? "personalization"
          : index % 4 === 0
            ? "new"
            : undefined,
    };

    return { product, listing };
  },
);

export const mockStorefrontProductRecords: readonly {
  product: MockProductCatalogRecord;
  storefront: MockStorefrontProjection;
}[] = [
  {
    product: createProduct({
      id: "silver-heart-ring",
      transportId: 2001,
      names: { ar: "خاتم فضة مرصع", en: "Studded silver ring" },
      imageUrl: "/images/home/heart-necklace.png",
      price: 150,
      primaryCategory: categories.jewelry,
    }),
    storefront: { category: "jewelry" },
  },
  {
    product: createProduct({
      id: "heart-necklace",
      transportId: 2002,
      names: { ar: "قلادة قلب فضية", en: "Silver heart necklace" },
      imageUrl: "/images/home/heart-necklace.png",
      price: 150,
      primaryCategory: categories.jewelry,
    }),
    storefront: { category: "jewelry" },
  },
  {
    product: createProduct({
      id: "personalized-heart-necklace",
      transportId: 2003,
      names: {
        ar: "قلادة قلب بالاسم",
        en: "Personalized heart necklace",
      },
      imageUrl: "/images/home/name-necklace.png",
      personalizable: true,
      price: 150,
      primaryCategory: categories.jewelry,
    }),
    storefront: { category: "jewelry", badge: "personalization" },
  },
  {
    product: createProduct({
      id: "womens-silver-bracelet",
      transportId: 2004,
      names: {
        ar: "أسورة فضة نسائية",
        en: "Women's silver bracelet",
      },
      imageUrl: "/images/home/name-necklace.png",
      price: 150,
      primaryCategory: categories.jewelry,
    }),
    storefront: { category: "accessories", badge: "new" },
  },
  {
    product: createProduct({
      id: "personalized-gold-chain",
      transportId: 2005,
      names: {
        ar: "سلسال ذهبي بالاسم",
        en: "Personalized gold chain",
      },
      imageUrl: "/images/home/heart-necklace.png",
      personalizable: true,
      price: 120,
      originalPrice: 150,
      discountPercentage: 20,
      primaryCategory: categories.jewelry,
    }),
    storefront: { category: "jewelry", badge: "discount" },
  },
  {
    product: createProduct({
      id: "amber-perfume",
      transportId: 2006,
      names: { ar: "عطر العنبر الفاخر", en: "Luxury amber perfume" },
      imageUrl: "/images/categories/perfumes.png",
      price: 180,
      primaryCategory: categories.perfumes,
    }),
    storefront: { category: "perfumes", badge: "new" },
  },
];

export const mockSearchProductRecords = [
  {
    product: createProduct({
      id: "silver-name-necklace",
      transportId: 3001,
      names: { ar: "سلسلة فضة بالاسم", en: "Silver name necklace" },
      imageUrl: "/ds-product-preview.svg",
      personalizable: true,
      price: 150,
      primaryCategory: categories.personalized,
    }),
    keywords: {
      ar: ["سلسلة", "فضة", "اسم"],
      en: ["silver", "name", "necklace"],
    },
  },
  {
    product: createProduct({
      id: "mens-bracelet",
      transportId: 3002,
      names: { ar: "سوار رجالي", en: "Men's bracelet" },
      imageUrl: "/ds-product-preview.svg",
      price: 120,
      primaryCategory: categories.mensGifts,
    }),
    keywords: { ar: ["سوار", "رجالي"], en: ["men", "bracelet"] },
  },
  {
    product: createProduct({
      id: "personalized-incense-burner",
      transportId: 3003,
      names: { ar: "مبخرة شخصية", en: "Personalized incense burner" },
      imageUrl: "/ds-product-preview.svg",
      personalizable: true,
      price: 185,
      primaryCategory: categories.personalized,
    }),
    keywords: {
      ar: ["مبخرة", "شخصية", "هدية"],
      en: ["personalized", "incense", "gift"],
    },
  },
  {
    product: createProduct({
      id: "graduation-gift",
      transportId: 3004,
      names: { ar: "هدية تخرج", en: "Graduation gift" },
      imageUrl: "/ds-product-preview.svg",
      price: 210,
      primaryCategory: categories.personalized,
    }),
    keywords: {
      ar: ["هدية", "تخرج"],
      en: ["graduation", "gift"],
    },
  },
] as const;

const catalogRecords = [
  ...mockCategoryProductRecords.map(({ product }) => product),
  ...mockStorefrontProductRecords.map(({ product }) => product),
  ...mockSearchProductRecords.map(({ product }) => product),
];

function assertUniqueCatalogIdentity(
  products: readonly MockProductCatalogRecord[],
): void {
  const ids = new Set<string>();
  const transportIds = new Set<number>();
  const slugs = new Set<string>();

  for (const product of products) {
    if (ids.has(product.id)) {
      throw new Error(`Duplicate mock Product ID "${product.id}".`);
    }
    if (slugs.has(product.slug)) {
      throw new Error(`Duplicate mock Product slug "${product.slug}".`);
    }
    if (transportIds.has(product.transportId)) {
      throw new Error(
        `Duplicate mock Product transport ID "${product.transportId}".`,
      );
    }

    ids.add(product.id);
    slugs.add(product.slug);
    transportIds.add(product.transportId);
  }
}

assertUniqueCatalogIdentity(catalogRecords);

export const mockProductCatalogRecords: readonly MockProductCatalogRecord[] =
  catalogRecords;
