import type { Locale } from "next-intl";

import { mockSearchProductRecords } from "@/features/products/data/mock-product-catalog";
import type { Money } from "@/types/money.types";

type MockProductRecord = {
  id: string;
  names: Record<Locale, string>;
  keywords: Record<Locale, readonly string[]>;
  thumbnailSrc: string;
  price: Money;
};

export const MOCK_SEARCH_PRODUCTS: readonly MockProductRecord[] =
  mockSearchProductRecords.map(({ keywords, product }) => ({
    id: product.id,
    names: product.names,
    keywords,
    thumbnailSrc: product.primaryImage.src,
    price: product.defaultPricing.current,
  }));
