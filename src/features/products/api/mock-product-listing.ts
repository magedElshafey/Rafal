import { mapProductListResponse } from "@/features/products/api/product-mappers";
import { parseProductListResponse } from "@/features/products/api/parse-product-dto";
import type { MockProductPayload } from "@/features/products/data/mock-product-contract";
import type {
  ListingProduct,
  ListingSort,
  ListingSubcategoryOption,
  PaginatedListingProducts,
  ProductListingFacets,
  ProductListingFilters,
} from "@/features/products/types/product-listing.types";

const perPage = 8;

type MockListingCompatibility = Pick<
  ListingProduct,
  "badge" | "createdOrder" | "subcategory"
>;

export type MockListingProductSource = {
  compatibility: MockListingCompatibility;
  payload: MockProductPayload;
};

type MappedMockListingProduct = {
  product: ListingProduct;
};

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

function mapMockListingSources(
  products: readonly MockListingProductSource[],
): readonly MappedMockListingProduct[] {
  const sourceByProductId = new Map(
    products.map((source) => [String(source.payload.id), source]),
  );
  const response = mapProductListResponse(
    parseProductListResponse({
      success: true,
      message: "Mock Products retrieved.",
      data: products.map(({ payload }) => payload),
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: Math.max(1, products.length),
        total: products.length,
      },
    }),
  );

  return response.items.flatMap((product) => {
    const source = sourceByProductId.get(product.id);
    return source ? [{ product: { ...product, ...source.compatibility } }] : [];
  });
}

export function createMockProductListing({
  filters,
  page,
  products,
  sort,
}: {
  filters: ProductListingFilters;
  page: number;
  products: readonly MockListingProductSource[];
  sort: ListingSort;
}): PaginatedListingProducts {
  const filteredProducts = mapMockListingSources(products).filter(
    ({ product }) =>
      (!filters.subcategory || product.subcategory === filters.subcategory) &&
      (filters.minPrice === undefined || product.price >= filters.minPrice) &&
      (filters.maxPrice === undefined || product.price <= filters.maxPrice) &&
      (!filters.inStock || product.inStock) &&
      (!filters.personalizable || product.personalizable),
  );
  const sortedProducts = [...filteredProducts].sort(
    ({ product: a }, { product: b }) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "newest") {
        return (b.createdOrder ?? 0) - (a.createdOrder ?? 0);
      }
      return b.salesCount - a.salesCount;
    },
  );
  const total = sortedProducts.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;

  return {
    items: sortedProducts
      .slice(start, start + perPage)
      .map(({ product }) => product),
    pagination: {
      current_page: page,
      last_page: lastPage,
      per_page: perPage,
      total,
    },
  };
}

export function mapMockListingProducts(
  products: readonly MockListingProductSource[],
): readonly ListingProduct[] {
  return mapMockListingSources(products).map(({ product }) => product);
}
