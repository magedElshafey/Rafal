import type { MockProductCatalogRecord } from "@/features/products/data/mock-product-catalog";
import type { ListingProduct } from "@/features/products/types/product-listing.types";
import type {
  StorefrontProduct,
  StorefrontProductBadge,
  StorefrontProductCategory,
} from "@/features/products/types/storefront-product.types";

type ListingProjectionInput = Pick<
  ListingProduct,
  "badge" | "createdOrder" | "inStock" | "salesCount" | "subcategory"
>;

export function toListingProduct(
  product: MockProductCatalogRecord,
  listing: ListingProjectionInput,
): ListingProduct {
  return {
    ...listing,
    id: product.id,
    imageUrl: product.primaryImage.src,
    name: product.names,
    originalPrice: product.defaultPricing.compareAt?.amount,
    personalizable: product.personalizable,
    price: product.defaultPricing.current.amount,
    rating: product.ratingSummary.average,
    slug: product.slug,
  };
}

export function toStorefrontProduct(
  product: MockProductCatalogRecord,
  storefront: {
    badge?: StorefrontProductBadge;
    category: StorefrontProductCategory;
  },
): StorefrontProduct {
  return {
    ...storefront,
    id: product.id,
    imageUrl: product.primaryImage.src,
    name: product.names,
    originalPrice: product.defaultPricing.compareAt?.amount,
    price: product.defaultPricing.current.amount,
    rating: product.ratingSummary.average,
    slug: product.slug,
  };
}
