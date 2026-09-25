"use client";

import { CatalogueListingError } from "@/features/products/components/listing/catalogue-listing-error";

type ProductsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProductsError({ reset }: ProductsErrorProps) {
  return <CatalogueListingError retry={reset} />;
}
