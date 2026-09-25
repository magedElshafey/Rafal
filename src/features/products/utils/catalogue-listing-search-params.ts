import {
  catalogueListingSortValues,
  type CatalogueListingSort,
  type CatalogueProductFilters,
} from "@/features/products/types/product-listing.types";

export const defaultCatalogueListingSort: CatalogueListingSort = "relevance";

export type CatalogueListingSearchState = {
  filters: CatalogueProductFilters;
  sort: CatalogueListingSort;
};

export type CatalogueListingSearchUpdate = Partial<CatalogueProductFilters> & {
  sort?: CatalogueListingSort;
};

function parsePrice(value: string | null): number | undefined {
  if (!value || value.trim() === "") return undefined;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : undefined;
}

export function parseCatalogueListingSearchParams(
  searchParams: URLSearchParams,
): CatalogueListingSearchState {
  const rawSort = searchParams.get("sort");
  const sort =
    catalogueListingSortValues.find((value) => value === rawSort) ??
    defaultCatalogueListingSort;

  return {
    filters: {
      maxPrice: parsePrice(searchParams.get("max_price")),
      minPrice: parsePrice(searchParams.get("min_price")),
      newArrival: searchParams.get("new_arrival") === "true",
      onDiscount: searchParams.get("on_discount") === "true",
      personalizable: searchParams.get("personalizable") === "true",
      subcategory: searchParams.get("subcategory")?.trim() || undefined,
    },
    sort,
  };
}

export function updateCatalogueListingSearchParams(
  current: URLSearchParams,
  update: CatalogueListingSearchUpdate,
): URLSearchParams {
  const next = new URLSearchParams(current);
  next.delete("page");

  if (update.sort !== undefined) {
    if (update.sort === defaultCatalogueListingSort) next.delete("sort");
    else next.set("sort", update.sort);
  }

  const filterKeys: Array<keyof CatalogueProductFilters> = [
    "minPrice",
    "maxPrice",
    "onDiscount",
    "personalizable",
    "newArrival",
    "subcategory",
  ];
  const queryKeys: Record<keyof CatalogueProductFilters, string> = {
    maxPrice: "max_price",
    minPrice: "min_price",
    newArrival: "new_arrival",
    onDiscount: "on_discount",
    personalizable: "personalizable",
    subcategory: "subcategory",
  };

  for (const key of filterKeys) {
    if (!(key in update)) continue;
    const value = update[key];
    const queryKey = queryKeys[key];

    if (
      value === undefined ||
      value === false ||
      value === "" ||
      (typeof value === "number" && (!Number.isFinite(value) || value < 0))
    ) {
      next.delete(queryKey);
    } else {
      next.set(queryKey, String(value));
    }
  }

  return next;
}

export function toUrlSearchParams(
  rawSearchParams: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(rawSearchParams)) {
    if (typeof value === "string") searchParams.set(key, value);
    else value?.forEach((item) => searchParams.append(key, item));
  }

  return searchParams;
}
