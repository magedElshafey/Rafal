"use client";

import { CatalogueListingError } from "@/features/products/components/listing/catalogue-listing-error";

type ProductsErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function ProductsError({ retry }: ProductsErrorProps) {
  return <CatalogueListingError retry={retry} />;
}
