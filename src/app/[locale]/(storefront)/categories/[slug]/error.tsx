"use client";

import { CatalogueListingError } from "@/features/products/components/listing/catalogue-listing-error";

type CategoryErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function CategoryError({ retry }: CategoryErrorProps) {
  return <CatalogueListingError retry={retry} />;
}
