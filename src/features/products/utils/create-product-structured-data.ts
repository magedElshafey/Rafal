import "server-only";

import type { ProductDetails } from "@/features/products/types/product-details.types";
import { getInitialProductVariant } from "@/features/products/utils/get-initial-product-variant";
import { sanitizeHtmlToText } from "@/lib/security/sanitize-html";

type ProductStructuredData = {
  "@context": "https://schema.org";
  "@type": "Product";
  aggregateRating?: {
    "@type": "AggregateRating";
    bestRating: 5;
    ratingCount: number;
    ratingValue: number;
  };
  description?: string;
  image: string[];
  name: string;
  offers: {
    "@type": "AggregateOffer";
    highPrice: number;
    lowPrice: number;
    offerCount: number;
    priceCurrency: "SAR";
    url: string;
  };
  sku: string;
  url: string;
};

export function createProductStructuredData(
  product: ProductDetails,
  canonicalUrl: string,
  siteUrl: URL,
): ProductStructuredData {
  const description = sanitizeHtmlToText(
    product.description.html,
    "product-rich-text",
  );
  const initialVariant = getInitialProductVariant(product);
  const ratingSummary = product.ratingSummary;
  const prices = product.variants.map(
    (variant) => variant.pricing.current.amount,
  );

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(description ? { description } : {}),
    sku: initialVariant.sku,
    image: product.images.map(({ src }) => new URL(src, siteUrl).toString()),
    url: canonicalUrl,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "SAR",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: product.variants.length,
      url: canonicalUrl,
    },
    ...(ratingSummary &&
    ratingSummary.count > 0 &&
    ratingSummary.average > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating" as const,
            ratingValue: ratingSummary.average,
            ratingCount: ratingSummary.count,
            bestRating: 5 as const,
          },
        }
      : {}),
  };
}

export function serializeStructuredData(data: ProductStructuredData): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
