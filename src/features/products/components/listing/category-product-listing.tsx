"use client";

import type { Locale } from "next-intl";

import { getCategoryProducts } from "@/features/products/api/get-category-products";
import { productListingQuery } from "@/features/products/api/product-listing-query";
import {
  ProductListing,
  type ProductListingCopy,
} from "@/features/products/components/listing/product-listing";
import type { ListingSubcategoryOption } from "@/features/products/types/product-listing.types";

type Props = {
  category: string;
  categoryTotal: number;
  copy: ProductListingCopy;
  locale: Locale;
  subcategoryOptions: readonly ListingSubcategoryOption[];
};

export function CategoryProductListing({
  category,
  categoryTotal,
  copy,
  locale,
  subcategoryOptions,
}: Props) {
  return (
    <ProductListing
      copy={copy}
      getPage={(filters, sort, page, signal) =>
        getCategoryProducts(
          { category, filters, locale, page, sort },
          signal,
        )
      }
      getNextPageParam={productListingQuery.getNextPageParam}
      getQueryKey={(filters, sort) =>
        productListingQuery.key(locale, category, filters, sort)
      }
      locale={locale}
      subcategoryOptions={subcategoryOptions}
      total={categoryTotal}
    />
  );
}

export type { ProductListingCopy };
