import type { Locale } from "next-intl";

import type {
  ProductPromotion,
  ProductRatingSummary,
  ProductVariantPricing,
} from "@/features/products/types/product-details.types";
import type {
  StorefrontProductBadge,
  StorefrontProductCategory,
} from "@/features/products/types/storefront-product.types";

type LocalizedText = Record<Locale, string>;

type MockProductCategory = {
  id: string;
  names: LocalizedText;
  slug: string;
};

export type MockProductCatalogRecord = {
  id: string;
  slug: string;
  names: LocalizedText;
  primaryCategory: MockProductCategory;
  primaryImage: {
    id: string;
    src: string;
  };
  defaultPricing: ProductVariantPricing;
  ratingSummary: ProductRatingSummary;
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
    names: { ar: "مجوهرات نسائية", en: "Women's jewelry" },
  },
  perfumes: {
    id: "perfumes",
    slug: "perfumes",
    names: { ar: "عطور", en: "Perfumes" },
  },
  personalized: {
    id: "personalized",
    slug: "personalized",
    names: { ar: "منتجات مخصصة", en: "Personalized products" },
  },
  mensGifts: {
    id: "mens-gifts",
    slug: "mens-gifts",
    names: { ar: "هدايا رجالية", en: "Men's gifts" },
  },
} as const satisfies Record<string, MockProductCategory>;

function createPricing(
  amount: number,
  compareAtAmount?: number,
  promotion: ProductPromotion | null = null,
): ProductVariantPricing {
  return {
    current: { amount, currency: "SAR" },
    compareAt:
      compareAtAmount === undefined
        ? null
        : { amount: compareAtAmount, currency: "SAR" },
    promotion,
  };
}

function createProduct({
  id,
  imageUrl,
  names,
  personalizable = false,
  price,
  promotion = null,
  originalPrice,
  primaryCategory,
  rating,
  ratingCount,
  slug = id,
}: {
  id: string;
  imageUrl: string;
  names: LocalizedText;
  personalizable?: boolean;
  price: number;
  promotion?: ProductPromotion | null;
  originalPrice?: number;
  primaryCategory: MockProductCategory;
  rating: number;
  ratingCount: number;
  slug?: string;
}): MockProductCatalogRecord {
  return {
    id,
    slug,
    names,
    primaryCategory,
    primaryImage: { id: `${id}-primary`, src: imageUrl },
    defaultPricing: createPricing(price, originalPrice, promotion),
    ratingSummary: { average: rating, count: ratingCount },
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

export const mockCategoryProductRecords = Array.from(
  { length: 24 },
  (_, index) => {
    const personalizable = index % 3 === 1;
    const discounted = index % 5 === 0;
    const price = 120 + (index % 6) * 15 + (index % 2 ? 0.5 : 0);
    const id = `women-jewelry-${index + 1}`;
    const product = createProduct({
      id,
      slug: `silver-necklace-${index + 1}`,
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
      rating: 4 + (index % 5) / 5,
      ratingCount: 18 + index * 3,
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
      names: { ar: "خاتم فضة مرصع", en: "Studded silver ring" },
      imageUrl: "/images/home/heart-necklace.png",
      price: 150,
      primaryCategory: categories.jewelry,
      rating: 4.8,
      ratingCount: 42,
    }),
    storefront: { category: "jewelry" },
  },
  {
    product: createProduct({
      id: "heart-necklace",
      names: { ar: "قلادة قلب فضية", en: "Silver heart necklace" },
      imageUrl: "/images/home/heart-necklace.png",
      price: 150,
      primaryCategory: categories.jewelry,
      rating: 4.7,
      ratingCount: 38,
    }),
    storefront: { category: "jewelry" },
  },
  {
    product: createProduct({
      id: "personalized-heart-necklace",
      names: {
        ar: "قلادة قلب بالاسم",
        en: "Personalized heart necklace",
      },
      imageUrl: "/images/home/name-necklace.png",
      personalizable: true,
      price: 150,
      primaryCategory: categories.jewelry,
      rating: 4.9,
      ratingCount: 67,
    }),
    storefront: { category: "jewelry", badge: "personalization" },
  },
  {
    product: createProduct({
      id: "womens-silver-bracelet",
      names: {
        ar: "أسورة فضة نسائية",
        en: "Women's silver bracelet",
      },
      imageUrl: "/images/home/name-necklace.png",
      price: 150,
      primaryCategory: categories.jewelry,
      rating: 4.6,
      ratingCount: 29,
    }),
    storefront: { category: "accessories", badge: "new" },
  },
  {
    product: createProduct({
      id: "personalized-gold-chain",
      names: {
        ar: "سلسال ذهبي بالاسم",
        en: "Personalized gold chain",
      },
      imageUrl: "/images/home/heart-necklace.png",
      personalizable: true,
      price: 120,
      originalPrice: 150,
      promotion: {
        id: "personalized-gold-chain-deal",
        endsAt: null,
      },
      primaryCategory: categories.jewelry,
      rating: 4.9,
      ratingCount: 54,
    }),
    storefront: { category: "jewelry", badge: "discount" },
  },
  {
    product: createProduct({
      id: "amber-perfume",
      names: { ar: "عطر العنبر الفاخر", en: "Luxury amber perfume" },
      imageUrl: "/images/categories/perfumes.png",
      price: 180,
      primaryCategory: categories.perfumes,
      rating: 4.5,
      ratingCount: 31,
    }),
    storefront: { category: "perfumes", badge: "new" },
  },
];

export const mockSearchProductRecords = [
  {
    product: createProduct({
      id: "silver-name-necklace",
      names: { ar: "سلسلة فضة بالاسم", en: "Silver name necklace" },
      imageUrl: "/ds-product-preview.svg",
      personalizable: true,
      price: 150,
      primaryCategory: categories.personalized,
      rating: 0,
      ratingCount: 0,
    }),
    keywords: {
      ar: ["سلسلة", "فضة", "اسم"],
      en: ["silver", "name", "necklace"],
    },
  },
  {
    product: createProduct({
      id: "mens-bracelet",
      names: { ar: "سوار رجالي", en: "Men's bracelet" },
      imageUrl: "/ds-product-preview.svg",
      price: 120,
      primaryCategory: categories.mensGifts,
      rating: 0,
      ratingCount: 0,
    }),
    keywords: { ar: ["سوار", "رجالي"], en: ["men", "bracelet"] },
  },
  {
    product: createProduct({
      id: "personalized-incense-burner",
      names: { ar: "مبخرة شخصية", en: "Personalized incense burner" },
      imageUrl: "/ds-product-preview.svg",
      personalizable: true,
      price: 185,
      primaryCategory: categories.personalized,
      rating: 0,
      ratingCount: 0,
    }),
    keywords: {
      ar: ["مبخرة", "شخصية", "هدية"],
      en: ["personalized", "incense", "gift"],
    },
  },
  {
    product: createProduct({
      id: "graduation-gift",
      names: { ar: "هدية تخرج", en: "Graduation gift" },
      imageUrl: "/ds-product-preview.svg",
      price: 210,
      primaryCategory: categories.personalized,
      rating: 0,
      ratingCount: 0,
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
  const slugs = new Set<string>();

  for (const product of products) {
    if (ids.has(product.id)) {
      throw new Error(`Duplicate mock Product ID "${product.id}".`);
    }
    if (slugs.has(product.slug)) {
      throw new Error(`Duplicate mock Product slug "${product.slug}".`);
    }

    ids.add(product.id);
    slugs.add(product.slug);
  }
}

assertUniqueCatalogIdentity(catalogRecords);

export const mockProductCatalogRecords: readonly MockProductCatalogRecord[] =
  catalogRecords;
