import type {
  ListingProduct,
  ListingSort,
  ListingSubcategoryOption,
  PaginatedListingProducts,
  ProductListingFacets,
  ProductListingFilters,
} from "@/features/products/types/product-listing.types";

const perPage = 8;

type SubcategoryDescriptor = Pick<
  ListingSubcategoryOption,
  "label" | "value"
>;

export function createMockListingFacets(
  products: readonly ListingProduct[],
  subcategories: readonly SubcategoryDescriptor[],
): ProductListingFacets {
  const counts = new Map<string, number>();

  for (const product of products) {
    counts.set(product.subcategory, (counts.get(product.subcategory) ?? 0) + 1);
  }

  return {
    subcategoryOptions: subcategories.map((subcategory) => ({
      ...subcategory,
      count: counts.get(subcategory.value) ?? 0,
    })),
    total: products.length,
  };
}

export function createMockProductListing({
  filters,
  page,
  products,
  sort,
}: {
  filters: ProductListingFilters;
  page: number;
  products: readonly ListingProduct[];
  sort: ListingSort;
}): PaginatedListingProducts {
  const filteredProducts = products.filter(
    (product) =>
      (!filters.subcategory || product.subcategory === filters.subcategory) &&
      (filters.minPrice === undefined || product.price >= filters.minPrice) &&
      (filters.maxPrice === undefined || product.price <= filters.maxPrice) &&
      (!filters.inStock || product.inStock) &&
      (!filters.personalizable || product.personalizable),
  );
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "newest") return b.createdOrder - a.createdOrder;
    return b.salesCount - a.salesCount;
  });
  const total = sortedProducts.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;

  return {
    items: sortedProducts.slice(start, start + perPage),
    pagination: {
      current_page: page,
      last_page: lastPage,
      per_page: perPage,
      total,
    },
  };
}
