import { MOCK_SEARCH_PRODUCTS } from "@/features/search/data/mock-products";
import type { SearchLocale, SearchProduct } from "@/features/search/types";

export type ProductSearchService = {
  searchProducts(query: string, locale: SearchLocale): Promise<SearchProduct[]>;
};

const MOCK_RESPONSE_DELAY_MS = 250;
const MAX_SUGGESTIONS = 5;

export const productSearchService: ProductSearchService = {
  async searchProducts(query, locale) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_RESPONSE_DELAY_MS));

    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    if (!normalizedQuery) return [];

    return MOCK_SEARCH_PRODUCTS.filter((product) => {
      const searchableText = [
        product.names[locale],
        ...product.keywords[locale],
      ]
        .join(" ")
        .toLocaleLowerCase(locale);

      return searchableText.includes(normalizedQuery);
    })
      .slice(0, MAX_SUGGESTIONS)
      .map((product) => ({
        id: product.id,
        name: product.names[locale],
        thumbnail: {
          src: product.thumbnailSrc,
          alt: product.names[locale],
        },
        price: product.price,
      }));
  },
};

export const searchProducts = productSearchService.searchProducts;
