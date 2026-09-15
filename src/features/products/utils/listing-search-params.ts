import {
  listingSortValues,
  type ListingSort,
  type ProductListingFilters,
} from "@/features/products/types/product-listing.types";

export const defaultListingSort: ListingSort = "best-selling";

export function parseListingSort(searchParams: URLSearchParams): ListingSort {
  const rawSort = searchParams.get("sort");
  return (
    listingSortValues.find((value) => value === rawSort) ?? defaultListingSort
  );
}

function parsePrice(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parseListingSearchParams(searchParams: URLSearchParams): {
  filters: ProductListingFilters;
  sort: ListingSort;
} {
  const sort = parseListingSort(searchParams);
  const subcategory = searchParams.get("subcategory")?.trim() || undefined;

  return {
    filters: {
      inStock: searchParams.get("inStock") === "true",
      maxPrice: parsePrice(searchParams.get("maxPrice")),
      minPrice: parsePrice(searchParams.get("minPrice")),
      personalizable: searchParams.get("personalizable") === "true",
      subcategory,
    },
    sort,
  };
}

export function updateListingSearchParams(
  current: URLSearchParams,
  updates: Partial<ProductListingFilters> & { sort?: ListingSort },
): URLSearchParams {
  const next = new URLSearchParams(current);
  const entries = Object.entries(updates) as [keyof typeof updates, unknown][];

  for (const [key, value] of entries) {
    if (key === "sort" && value === defaultListingSort) next.delete(key);
    else if (value === undefined || value === false || value === "")
      next.delete(key);
    else next.set(key, String(value));
  }

  return next;
}
