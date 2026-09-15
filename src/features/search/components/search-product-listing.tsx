"use client";

import type { Locale } from "next-intl";

import {
  ProductListing,
  type ProductListingCopy,
} from "@/features/products/components/listing/product-listing";
import type { ListingSubcategoryOption } from "@/features/products/types/product-listing.types";
import { searchProductListingQuery } from "@/features/search/api/search-product-listing-query";
import { searchListingProducts } from "@/features/search/api/search-products";

type SearchProductListingProps = {
  copy: ProductListingCopy;
  locale: Locale;
  query: string;
  subcategoryOptions: readonly ListingSubcategoryOption[];
  total: number;
};

export function SearchProductListing({
  copy,
  locale,
  query,
  subcategoryOptions,
  total,
}: SearchProductListingProps) {
  return (
    <ProductListing
      copy={copy}
      getPage={(filters, sort, page, signal) =>
        searchListingProducts(
          { filters, locale, page, query, sort },
          signal,
        )
      }
      getNextPageParam={searchProductListingQuery.getNextPageParam}
      getQueryKey={(filters, sort) =>
        searchProductListingQuery.key(locale, query, filters, sort)
      }
      locale={locale}
      subcategoryOptions={subcategoryOptions}
      total={total}
    />
  );
}
