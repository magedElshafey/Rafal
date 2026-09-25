import type { Locale } from "next-intl";

import { ProductGrid } from "@/features/products/components/listing/product-grid";
import type { ListingProduct } from "@/features/products/types/product-listing.types";

type RelatedProductsProps = {
  badgeLabels: Record<"discount" | "new" | "personalization", string>;
  locale: Locale;
  products: readonly ListingProduct[];
  ratingLabel: (value: string) => string;
  reviewsLabel: (count: number) => string;
  title: string;
  unavailableLabel: string;
};

export function RelatedProducts({
  badgeLabels,
  locale,
  products,
  ratingLabel,
  reviewsLabel,
  title,
  unavailableLabel,
}: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="related-products-title">
      <h2 id="related-products-title" className="text-h3 font-bold">
        {title}
      </h2>
      <ProductGrid
        badgeLabels={badgeLabels}
        className="mt-5 lg:grid-cols-6"
        locale={locale}
        products={products}
        ratingLabel={ratingLabel}
        reviewsLabel={reviewsLabel}
        unavailableLabel={unavailableLabel}
      />
    </section>
  );
}
