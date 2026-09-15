import { categoryProductsFixture } from "@/features/products/api/category-products-fixture";
import type {
  CategoryProductsRequest,
  ListingSubcategoryOption,
  PaginatedListingProducts,
  ProductListingFacets,
} from "@/features/products/types/product-listing.types";

const perPage = 8;

type SubcategoryDescriptor = Pick<
  ListingSubcategoryOption,
  "label" | "value"
>;

// Temporary mock facet source. A future products response can replace this
// helper without changing ListingFilters or its option contract.
export function getCategoryListingFacets(
  subcategories: readonly SubcategoryDescriptor[],
): ProductListingFacets {
  const counts = new Map<string, number>();

  for (const product of categoryProductsFixture) {
    counts.set(product.subcategory, (counts.get(product.subcategory) ?? 0) + 1);
  }

  return {
    subcategoryOptions: subcategories.map((subcategory) => ({
      ...subcategory,
      count: counts.get(subcategory.value) ?? 0,
    })),
    total: categoryProductsFixture.length,
  };
}

export async function getCategoryProducts(
  request: CategoryProductsRequest,
  signal?: AbortSignal,
): Promise<PaginatedListingProducts> {
  signal?.throwIfAborted();
  const { filters, page, sort } = request;
  let products = categoryProductsFixture.filter(
    (product) =>
      (!filters.subcategory || product.subcategory === filters.subcategory) &&
      (filters.minPrice === undefined || product.price >= filters.minPrice) &&
      (filters.maxPrice === undefined || product.price <= filters.maxPrice) &&
      (!filters.inStock || product.inStock) &&
      (!filters.personalizable || product.personalizable),
  );

  products = [...products].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "newest") return b.createdOrder - a.createdOrder;
    return b.salesCount - a.salesCount;
  });

  const total = products.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;

  return Promise.resolve({
    items: products.slice(start, start + perPage),
    pagination: {
      current_page: page,
      last_page: lastPage,
      per_page: perPage,
      total,
    },
  });
}
