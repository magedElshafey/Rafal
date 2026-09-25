"use client";

import { CatalogueListingError } from "@/features/products/components/listing/catalogue-listing-error";

type CategoryErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CategoryError({ reset }: CategoryErrorProps) {
  return <CatalogueListingError retry={reset} />;
}
