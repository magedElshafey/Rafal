import "server-only";

import type { Locale } from "next-intl";

import {
  mapMockListingProducts,
  type MockListingProductSource,
} from "@/features/products/api/mock-product-listing";
import { mapProductDetailsResponse } from "@/features/products/api/product-mappers";
import { parseProductDetailsResponse } from "@/features/products/api/parse-product-dto";
import {
  mockCategoryProductRecords,
  mockProductCatalogRecords,
  mockSearchProductRecords,
  mockStorefrontProductRecords,
  type MockProductCatalogRecord,
} from "@/features/products/data/mock-product-catalog";
import {
  createMockProductDetailsResponsePayload,
  createMockProductPayload,
  getMockProductTransportId,
} from "@/features/products/data/mock-product-contract";
import type {
  ProductDetails,
  ProductVariant,
} from "@/features/products/types/product-details.types";
import type { ListingProduct } from "@/features/products/types/product-listing.types";

function createListingSources(
  locale: Locale,
): readonly MockListingProductSource[] {
  const categorySources = mockCategoryProductRecords.map(
    ({ listing, product }) => ({
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
    }),
  );
  const storefrontSources = mockStorefrontProductRecords.map(
    ({ product, storefront }, index) => ({
      payload: createMockProductPayload(product, locale, {
        badge: storefront.badge,
      }),
      compatibility: {
        badge: storefront.badge,
        createdOrder: categorySources.length + index + 1,
        subcategory: storefront.category,
      },
    }),
  );
  const searchSources = mockSearchProductRecords.map(({ product }, index) => ({
    payload: createMockProductPayload(product, locale),
    compatibility: {
      createdOrder:
        categorySources.length + storefrontSources.length + index + 1,
      subcategory: product.primaryCategory.slug,
    },
  }));

  return [...categorySources, ...storefrontSources, ...searchSources];
}

function mapDetails(
  product: MockProductCatalogRecord,
  locale: Locale,
): ProductDetails | null {
  const details = mapProductDetailsResponse(
    parseProductDetailsResponse(
      createMockProductDetailsResponsePayload(product, locale),
    ),
  );
  if (!details || product.id !== "personalized-gold-chain") return details;

  const swatchByLabel = new Map<string, `#${string}`>(
    locale === "ar"
      ? [
          ["فضي", "#C0C0C0"],
          ["ذهبي", "#D4AF37"],
          ["ذهبي وردي", "#B76E79"],
        ]
      : [
          ["Silver", "#C0C0C0"],
          ["Gold", "#D4AF37"],
          ["Rose gold", "#B76E79"],
        ],
  );

  return {
    ...details,
    options: details.options.map((option) =>
      option.key === "color"
        ? {
            ...option,
            name: locale === "ar" ? "اللون" : "Color",
            values: option.values.map((value) => ({
              ...value,
              swatchHex: swatchByLabel.get(value.label),
            })),
          }
        : option,
    ),
  };
}

function getListingProducts(locale: Locale): readonly ListingProduct[] {
  return mapMockListingProducts(createListingSources(locale));
}

function findProductByTransportId(
  productId: string,
): MockProductCatalogRecord | undefined {
  return mockProductCatalogRecords.find(
    (product) => String(getMockProductTransportId(product.id)) === productId,
  );
}

const knownProductIds = new Set(
  mockProductCatalogRecords.map((product) =>
    String(getMockProductTransportId(product.id)),
  ),
);

export const mockCatalogProductIds = Array.from(knownProductIds);

export function isKnownProductId(productId: string): boolean {
  return knownProductIds.has(productId);
}

export function getListingProductById(
  productId: string,
  locale: Locale,
): ListingProduct | undefined {
  return getListingProducts(locale).find((product) => product.id === productId);
}

export function getMockRelatedProducts(
  categoryId: string,
  currentProductId: string,
  locale: Locale,
  limit: number,
): readonly ListingProduct[] {
  return getListingProducts(locale)
    .filter((product) => {
      if (product.id === currentProductId) return false;
      const sourceProduct = findProductByTransportId(product.id);
      return (
        sourceProduct !== undefined &&
        String(sourceProduct.primaryCategory.transportId) === categoryId
      );
    })
    .slice(0, limit);
}

export type MockComplementaryProductCandidate = {
  listingProduct: ListingProduct;
  variants: readonly ProductVariant[];
};

export function getMockComplementaryProductCandidates(
  currentProductId: string,
  locale: Locale,
): readonly MockComplementaryProductCandidate[] {
  return getListingProducts(locale)
    .filter((listingProduct) => listingProduct.id !== currentProductId)
    .flatMap((listingProduct) => {
      const sourceProduct = findProductByTransportId(listingProduct.id);
      if (!sourceProduct) return [];

      const details = mapDetails(sourceProduct, locale);
      return details ? [{ listingProduct, variants: details.variants }] : [];
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
  const product = mockProductCatalogRecords.find(
    (candidate) => candidate.slug === slug,
  );
  return product ? mapDetails(product, locale) : null;
}

export function getMockProductDetailsById(
  productId: string,
  locale: Locale,
): ProductDetails | null {
  const product = findProductByTransportId(productId);
  return product ? mapDetails(product, locale) : null;
}
