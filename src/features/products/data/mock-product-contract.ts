import type { Locale } from "next-intl";

import type {
  ProductDto,
  ProductVariantDto,
} from "@/features/products/api/product-dto";
import {
  mockProductCatalogRecords,
  type MockProductCatalogRecord,
} from "@/features/products/data/mock-product-catalog";
import type { StorefrontProductBadge } from "@/features/products/types/storefront-product.types";

type MockVariantPayload = Omit<ProductVariantDto, "attributes"> & {
  attributes: ProductVariantDto["attributes"] | null;
};

export type MockProductPayload = Omit<ProductDto, "variants"> & {
  variants: readonly MockVariantPayload[];
};

export type MockProductTransportOptions = {
  badge?: StorefrontProductBadge;
  inStock?: boolean;
  pricing?: MockProductCatalogRecord["pricing"];
  timesOrdered?: number;
};

const productByAuthoringId = new Map(
  mockProductCatalogRecords.map((product) => [product.id, product]),
);

const personalizationByProductId: Readonly<
  Record<string, { maxLength: number; fee: string | null }>
> = {
  "personalized-heart-necklace": { maxLength: 10, fee: "20" },
  "personalized-gold-chain": { maxLength: 10, fee: "20" },
  "silver-name-necklace": { maxLength: 12, fee: null },
  "personalized-incense-burner": { maxLength: 14, fee: null },
  "women-jewelry-2": { maxLength: 12, fee: null },
  "women-jewelry-5": { maxLength: 14, fee: null },
  "women-jewelry-8": { maxLength: 10, fee: null },
  "women-jewelry-11": { maxLength: 12, fee: null },
  "women-jewelry-14": { maxLength: 14, fee: null },
  "women-jewelry-17": { maxLength: 10, fee: null },
  "women-jewelry-20": { maxLength: 12, fee: null },
  "women-jewelry-23": { maxLength: 14, fee: null },
};

const badgeLabels: Record<
  Locale,
  Record<StorefrontProductBadge, string>
> = {
  ar: {
    discount: "خصم",
    new: "جديد",
    personalization: "بالاسم",
  },
  en: {
    discount: "Sale",
    new: "New",
    personalization: "Personalized",
  },
};

export function getMockProductTransportId(productId: string): number {
  const product = productByAuthoringId.get(productId);
  if (!product) {
    throw new Error(`Unknown mock Product authoring ID "${productId}".`);
  }
  return product.transportId;
}

export type MockVariantIdentity =
  | "default"
  | "silver"
  | "gold"
  | "rose-gold";

const variantIdOffset: Record<MockVariantIdentity, number> = {
  default: 1,
  silver: 1,
  gold: 2,
  "rose-gold": 3,
};

export function getMockVariantTransportId(
  productId: string,
  identity: MockVariantIdentity = "default",
): number {
  return getMockProductTransportId(productId) * 10 + variantIdOffset[identity];
}

function createMockSku(productId: string, suffix = "DEFAULT") {
  const productCode = productId.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
  return `MOCK-${productCode}-${suffix}`;
}

function createVariantPayloads(
  product: MockProductCatalogRecord,
  locale: Locale,
  pricing: MockProductCatalogRecord["pricing"],
  quantity: number,
): readonly MockVariantPayload[] {
  const commonFields = {
    effective_price: pricing.effectivePrice,
    effective_price_incl_vat: pricing.effectivePriceInclVat,
    discounted_price: pricing.discountedPrice,
    discounted_price_incl_vat: pricing.discountedPriceInclVat,
    warehouse_stocks: [{ warehouse_id: 1, quantity }],
  };

  if (product.id !== "personalized-gold-chain") {
    return [
      {
        ...commonFields,
        id: getMockVariantTransportId(product.id),
        sku: createMockSku(product.id),
        attributes: null,
        images: [],
      },
    ];
  }

  const productTransportId = getMockProductTransportId(product.id);
  const finishes = [
    {
      identity: "silver",
      suffix: "SILVER",
      value: locale === "ar" ? "فضي" : "Silver",
      image: {
        id: productTransportId * 100 + 2,
        url: "/images/home/name-necklace.png",
      },
    },
    {
      identity: "gold",
      suffix: "GOLD",
      value: locale === "ar" ? "ذهبي" : "Gold",
      image: {
        id: productTransportId * 100 + 3,
        url: "/images/categories/womens-jewelry.png",
      },
    },
    {
      identity: "rose-gold",
      suffix: "ROSE-GOLD",
      value: locale === "ar" ? "ذهبي وردي" : "Rose gold",
      image: {
        id: productTransportId * 100 + 2,
        url: "/images/home/name-necklace.png",
      },
    },
  ] as const;

  return finishes.map((finish) => ({
    ...commonFields,
    id: getMockVariantTransportId(product.id, finish.identity),
    sku: createMockSku(product.id, finish.suffix),
    attributes: { color: finish.value },
    images: [finish.image],
  }));
}

export function createMockProductPayload(
  product: MockProductCatalogRecord,
  locale: Locale,
  options: MockProductTransportOptions = {},
): MockProductPayload {
  const productId = getMockProductTransportId(product.id);
  const pricing = options.pricing ?? product.pricing;
  const personalization = personalizationByProductId[product.id];

  if (product.personalizable !== Boolean(personalization)) {
    throw new Error(
      `Mock Product "${product.id}" personalization configuration is inconsistent.`,
    );
  }

  return {
    id: productId,
    sku: createMockSku(product.id, "PRODUCT"),
    name: product.names[locale],
    description: `<p>${
      locale === "ar"
        ? `${product.names[locale]} من منتجات رافال المختارة بعناية.`
        : `${product.names[locale]} is part of Rafal's carefully selected collection.`
    }</p>`,
    slug: product.slug,
    base_price: pricing.effectivePrice,
    discount_percentage: pricing.discountPercentage,
    discount_end_at: pricing.discountEndAt,
    badges: options.badge ? [badgeLabels[locale][options.badge]] : [],
    is_personalizable: product.personalizable,
    personalization_max_length: personalization?.maxLength ?? null,
    personalization_fee: personalization?.fee ?? null,
    viewers_now: 0,
    times_ordered: options.timesOrdered ?? 0,
    images: [
      {
        id: productId * 100 + 1,
        url: product.primaryImage.src,
      },
    ],
    category: {
      id: product.primaryCategory.transportId,
      name: product.primaryCategory.names[locale],
      slug: product.primaryCategory.slug,
    },
    variants: createVariantPayloads(
      product,
      locale,
      pricing,
      options.inStock === false ? 0 : 10,
    ),
  };
}

export function createMockProductDetailsResponsePayload(
  product: MockProductCatalogRecord,
  locale: Locale,
) {
  return {
    success: true,
    message: "Mock Product retrieved.",
    data: createMockProductPayload(product, locale),
  };
}
