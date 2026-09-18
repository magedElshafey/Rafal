import "server-only";

import type { Locale } from "next-intl";

import {
  mockCategoryProductRecords,
  mockProductCatalogRecords,
  mockSearchProductRecords,
  mockStorefrontProductRecords,
  type MockProductCatalogRecord,
} from "@/features/products/data/mock-product-catalog";
import { toListingProduct } from "@/features/products/data/product-projections";
import type { ListingProduct } from "@/features/products/types/product-listing.types";
import type {
  ProductDetails,
  ProductImage,
  ProductOption,
  ProductPersonalizationConfig,
  ProductVariant,
} from "@/features/products/types/product-details.types";
import type { Money } from "@/types/money.types";

type EnabledPersonalizationConfig = Extract<
  ProductPersonalizationConfig,
  { enabled: true }
>;

function createEnabledPersonalization(
  maxLength: number,
  additionalFee: Money | null,
): EnabledPersonalizationConfig {
  return {
    enabled: true,
    maxLength,
    allowedLanguages: ["arabic", "english"],
    characterPolicy: "letters-and-spaces",
    additionalFee,
  };
}

const mockPersonalizationByProductId: Readonly<
  Record<string, EnabledPersonalizationConfig>
> = {
  "personalized-heart-necklace": createEnabledPersonalization(10, {
    amount: 20,
    currency: "SAR",
  }),
  "personalized-gold-chain": createEnabledPersonalization(10, {
    amount: 20,
    currency: "SAR",
  }),
  "silver-name-necklace": createEnabledPersonalization(12, null),
  "personalized-incense-burner": createEnabledPersonalization(14, null),
  "women-jewelry-2": createEnabledPersonalization(12, null),
  "women-jewelry-5": createEnabledPersonalization(14, null),
  "women-jewelry-8": createEnabledPersonalization(10, null),
  "women-jewelry-11": createEnabledPersonalization(12, null),
  "women-jewelry-14": createEnabledPersonalization(14, null),
  "women-jewelry-17": createEnabledPersonalization(10, null),
  "women-jewelry-20": createEnabledPersonalization(12, null),
  "women-jewelry-23": createEnabledPersonalization(14, null),
};

type MockDetailImage = {
  id: string;
  src: string;
  alts: Record<Locale, string>;
};

const mockAdditionalImagesByProductId: Readonly<
  Partial<Record<string, readonly MockDetailImage[]>>
> = {
  "personalized-gold-chain": [
    {
      id: "personalized-gold-chain-name-detail",
      src: "/images/home/name-necklace.png",
      alts: {
        ar: "تفاصيل نقش الاسم على السلسال",
        en: "Personalized name engraving detail on the chain",
      },
    },
    {
      id: "personalized-gold-chain-gold-finish",
      src: "/images/categories/womens-jewelry.png",
      alts: {
        ar: "تفاصيل التشطيب الذهبي للسلسال",
        en: "Gold finish detail of the chain",
      },
    },
  ],
};

function assertPersonalizationConsistency(
  products: readonly MockProductCatalogRecord[],
): void {
  const productIds = new Set(products.map((product) => product.id));

  for (const product of products) {
    const hasConfig = Object.prototype.hasOwnProperty.call(
      mockPersonalizationByProductId,
      product.id,
    );

    if (product.personalizable !== hasConfig) {
      throw new Error(
        `Mock Product "${product.id}" personalization eligibility and detail configuration must agree.`,
      );
    }
  }

  for (const productId of Object.keys(mockPersonalizationByProductId)) {
    if (!productIds.has(productId)) {
      throw new Error(
        `Mock personalization configuration references unknown Product "${productId}".`,
      );
    }
  }
}

assertPersonalizationConsistency(mockProductCatalogRecords);

function getPersonalizationConfig(
  product: MockProductCatalogRecord,
): ProductPersonalizationConfig {
  if (!product.personalizable) return { enabled: false };

  const config = mockPersonalizationByProductId[product.id];
  if (!config) {
    throw new Error(
      `Missing mock personalization configuration for product "${product.id}".`,
    );
  }

  return config;
}

function createMockSku(productId: string, suffix = "DEFAULT") {
  const productCode = productId.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
  return `MOCK-${productCode}-${suffix}`;
}

function getProductImages(
  product: MockProductCatalogRecord,
  locale: Locale,
): readonly ProductImage[] {
  return [
    {
      id: product.primaryImage.id,
      src: product.primaryImage.src,
      alt: product.names[locale],
    },
    ...(mockAdditionalImagesByProductId[product.id] ?? []).map((image) => ({
      id: image.id,
      src: image.src,
      alt: image.alts[locale],
    })),
  ];
}

function getVariantConfiguration(
  product: MockProductCatalogRecord,
  locale: Locale,
): {
  defaultVariantId: string;
  options: readonly ProductOption[];
  variants: readonly ProductVariant[];
} {
  const imageIds = [product.primaryImage.id];

  if (product.id === "personalized-gold-chain") {
    const optionId = "personalized-gold-chain-finish";
    const options: readonly ProductOption[] = [
      {
        id: optionId,
        key: "color",
        name: locale === "ar" ? "اللون" : "Color",
        values: [
          {
            id: "silver",
            label: locale === "ar" ? "فضي" : "Silver",
            swatchHex: "#C0C0C0",
          },
          {
            id: "gold",
            label: locale === "ar" ? "ذهبي" : "Gold",
            swatchHex: "#D4AF37",
          },
          {
            id: "rose-gold",
            label: locale === "ar" ? "ذهبي وردي" : "Rose gold",
            swatchHex: "#B76E79",
          },
        ],
      },
    ];
    const variants: readonly ProductVariant[] = [
      {
        id: "personalized-gold-chain-silver",
        sku: createMockSku(product.id, "SILVER"),
        optionValues: [{ optionId, valueId: "silver" }],
        pricing: product.defaultPricing,
        imageIds: ["personalized-gold-chain-name-detail"],
      },
      {
        id: "personalized-gold-chain-gold",
        sku: createMockSku(product.id, "GOLD"),
        optionValues: [{ optionId, valueId: "gold" }],
        pricing: product.defaultPricing,
        imageIds: ["personalized-gold-chain-gold-finish"],
      },
      {
        id: "personalized-gold-chain-rose-gold",
        sku: createMockSku(product.id, "ROSE-GOLD"),
        optionValues: [{ optionId, valueId: "rose-gold" }],
        pricing: product.defaultPricing,
        imageIds: ["personalized-gold-chain-name-detail"],
      },
    ];

    return {
      defaultVariantId: "personalized-gold-chain-silver",
      options,
      variants,
    };
  }

  const defaultVariantId = `${product.id}-default`;

  return {
    defaultVariantId,
    options: [],
    variants: [
      {
        id: defaultVariantId,
        sku: createMockSku(product.id),
        optionValues: [],
        pricing: product.defaultPricing,
        imageIds,
      },
    ],
  };
}

function toProductDetails(
  product: MockProductCatalogRecord,
  locale: Locale,
): ProductDetails {
  const name = product.names[locale];
  const images = getProductImages(product, locale);
  const variantConfiguration = getVariantConfiguration(product, locale);
  const imageIds = new Set(images.map((image) => image.id));

  for (const variant of variantConfiguration.variants) {
    for (const imageId of variant.imageIds) {
      if (!imageIds.has(imageId)) {
        throw new Error(
          `Mock Product variant "${variant.id}" references unknown image "${imageId}".`,
        );
      }
    }
  }

  return {
    id: product.id,
    slug: product.slug,
    name,
    description: {
      format: "plain-text",
      paragraphs: [
        locale === "ar"
          ? `${name} من منتجات رافال المختارة بعناية.`
          : `${name} is part of Rafal's carefully selected collection.`,
      ],
    },
    category: {
      id: product.primaryCategory.id,
      name: product.primaryCategory.names[locale],
      slug: product.primaryCategory.slug,
    },
    images,
    ...variantConfiguration,
    ratingSummary: product.ratingSummary,
    personalization: getPersonalizationConfig(product),
  };
}

const categoryListingProducts = mockCategoryProductRecords.map(
  ({ listing, product }) => toListingProduct(product, listing),
);
const storefrontListingProducts = mockStorefrontProductRecords.map(
  ({ product, storefront }, index) =>
    toListingProduct(product, {
      badge: storefront.badge,
      createdOrder: index + 1,
      inStock: true,
      salesCount: 0,
      subcategory: storefront.category,
    }),
);
const searchListingProducts = mockSearchProductRecords.map(
  ({ product }, index) =>
    toListingProduct(product, {
      createdOrder:
        categoryListingProducts.length +
        storefrontListingProducts.length +
        index +
        1,
      inStock: true,
      salesCount: 0,
      subcategory: product.primaryCategory.slug,
    }),
);
const listingProducts = [
  ...categoryListingProducts,
  ...storefrontListingProducts,
  ...searchListingProducts,
];

const productsById = new Map(
  mockProductCatalogRecords.map((product) => [product.id, product]),
);
const productsBySlug = new Map(
  mockProductCatalogRecords.map((product) => [product.slug, product]),
);
const listingProductsById = new Map(
  listingProducts.map((product) => [product.id, product]),
);

export const mockCatalogProductIds = mockProductCatalogRecords.map(
  (product) => product.id,
);

export function isKnownProductId(productId: string): boolean {
  return productsById.has(productId);
}

export function getListingProductById(
  productId: string,
): ListingProduct | undefined {
  return listingProductsById.get(productId);
}

export function getMockRelatedProducts(
  categoryId: string,
  currentProductId: string,
  limit: number,
): readonly ListingProduct[] {
  return Array.from(listingProductsById.values())
    .filter(
      (product) =>
        product.id !== currentProductId &&
        productsById.get(product.id)?.primaryCategory.id === categoryId,
    )
    .slice(0, limit);
}

export type MockComplementaryProductCandidate = {
  listingProduct: ListingProduct;
  variants: readonly ProductVariant[];
};

export function getMockComplementaryProductCandidates(
  currentProductId: string,
): readonly MockComplementaryProductCandidate[] {
  return Array.from(listingProductsById.values())
    .filter((listingProduct) => listingProduct.id !== currentProductId)
    .map((listingProduct) => {
      const catalogProduct = productsById.get(listingProduct.id);
      if (!catalogProduct) {
        throw new Error(
          `Listing projection references unknown Product "${listingProduct.id}".`,
        );
      }

      // Variant identity is locale-independent. The locale is used only for
      // option labels, which are not returned from this mock catalog read.
      const { variants } = getVariantConfiguration(catalogProduct, "en");

      return { listingProduct, variants };
    });
}

function getStableSelectionOffset(
  value: string,
  candidateCount: number,
): number {
  if (candidateCount === 0) return 0;

  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  }

  return hash % candidateCount;
}

export function selectMockComplementaryProducts(
  eligibleProducts: readonly ListingProduct[],
  currentProductId: string,
  locationId: string,
  limit: number,
): readonly ListingProduct[] {
  const offset = getStableSelectionOffset(
    `${currentProductId}:${locationId}`,
    eligibleProducts.length,
  );
  const orderedCandidates = [
    ...eligibleProducts.slice(offset),
    ...eligibleProducts.slice(0, offset),
  ];

  return orderedCandidates.slice(0, limit);
}

export function getMockProductDetailsBySlug(
  slug: string,
  locale: Locale,
): ProductDetails | null {
  const product = productsBySlug.get(slug);
  return product ? toProductDetails(product, locale) : null;
}

export function getMockProductDetailsById(
  productId: string,
  locale: Locale,
): ProductDetails | null {
  const product = productsById.get(productId);
  return product ? toProductDetails(product, locale) : null;
}
