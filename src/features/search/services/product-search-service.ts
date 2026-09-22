import type { Locale } from "next-intl";

import { getMockSearchProducts } from "@/features/search/data/mock-products";
import type { SearchProduct } from "@/features/search/types";

export type ProductSearchService = {
  searchProducts(query: string, locale: Locale): Promise<SearchProduct[]>;
};

const MOCK_RESPONSE_DELAY_MS = 250;
const MAX_SUGGESTIONS = 5;

export const productSearchService: ProductSearchService = {
  async searchProducts(query, locale) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_RESPONSE_DELAY_MS));

    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    if (!normalizedQuery) return [];

    return getMockSearchProducts(locale).filter((product) => {
      const searchableText = [
        product.name,
        ...product.keywords,
      ]
        .join(" ")
        .toLocaleLowerCase(locale);

      return searchableText.includes(normalizedQuery);
    })
      .slice(0, MAX_SUGGESTIONS)
      .map((product) => ({
        id: product.id,
        name: product.name,
        thumbnail: {
          src: product.thumbnailSrc,
          alt: product.name,
        },
        price: product.price,
      }));
  },
};

export const searchProducts = productSearchService.searchProducts;
