import type { ProductDetails } from "@/features/products/types/product-details.types";
import { getDefaultProductVariant } from "@/features/products/utils/get-default-product-variant";

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
  const description = product.description.paragraphs.join(" ").trim();
  const defaultVariant = getDefaultProductVariant(product);
  const prices = product.variants.map(
    (variant) => variant.pricing.current.amount,
  );

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(description ? { description } : {}),
    sku: defaultVariant.sku,
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
    ...(product.ratingSummary.count > 0 && product.ratingSummary.average > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating" as const,
            ratingValue: product.ratingSummary.average,
            ratingCount: product.ratingSummary.count,
            bestRating: 5 as const,
          },
        }
      : {}),
  };
}

export function serializeStructuredData(data: ProductStructuredData): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
