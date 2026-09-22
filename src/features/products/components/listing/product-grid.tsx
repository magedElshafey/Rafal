import type { Locale } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import {
  ProductCard,
  type ProductCardAction,
} from "@/features/products/components/product-card";
import type { ListingProduct } from "@/features/products/types/product-listing.types";
import { ProductWishlistAction } from "@/features/wishlist/components/product-wishlist-action";
import { cn } from "@/lib/utils";

type ProductGridProps = {
  className?: string;
  locale: Locale;
  products: readonly ListingProduct[];
  ratingLabel: (value: number) => string;
  badgeLabels: Record<"discount" | "new" | "personalization", string>;
  unavailableLabel: string;
  getWishlistAction?: (product: ListingProduct) => ProductCardAction;
};

const productGridClassName =
  "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4";

export function ListingProductCard({
  badgeLabels,
  getWishlistAction,
  locale,
  product,
  ratingLabel,
  unavailableLabel,
}: Omit<ProductGridProps, "className" | "products"> & {
  product: ListingProduct;
}) {
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "SAR",
  });
  const name = product.name;
  const cardProps = {
    badge: product.badge
      ? { variant: product.badge, label: badgeLabels[product.badge] }
      : undefined,
    href: `/products/${product.slug}`,
    image: product.imageUrl,
    imageAlt: name,
    imageSizes: "(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 18vw",
    originalPrice: product.originalPrice
      ? currency.format(product.originalPrice)
      : undefined,
    price: currency.format(product.price),
    rating:
      product.rating === null
        ? undefined
        : {
            value: product.rating,
            label: ratingLabel(product.rating),
          },
    title: name,
    wishlistAction: getWishlistAction?.(product),
    wishlistControl: getWishlistAction ? undefined : (
      <ProductWishlistAction productId={product.id} />
    ),
  };

  return product.inStock ? (
    <ProductCard {...cardProps} />
  ) : (
    <ProductCard
      {...cardProps}
      unavailable
      unavailableLabel={unavailableLabel}
    />
  );
}

export function ProductGrid({
  badgeLabels,
  className,
  getWishlistAction,
  locale,
  products,
  ratingLabel,
  unavailableLabel,
}: ProductGridProps) {
  return (
    <div className={cn(productGridClassName, className)}>
      {products.map((product) => (
        <ListingProductCard
          key={product.id}
          badgeLabels={badgeLabels}
          getWishlistAction={getWishlistAction}
          locale={locale}
          product={product}
          ratingLabel={ratingLabel}
          unavailableLabel={unavailableLabel}
        />
      ))}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <article className="relative flex w-full self-start flex-col gap-2 rounded-md bg-gray-0 pb-2.5">
      <Skeleton className="aspect-square w-full rounded-sm" />
      <div className="flex flex-col items-end gap-1 px-1.5">
        <Skeleton className="h-4 w-4/5" />
        <div className="flex h-[var(--rating-star-size)] w-[var(--rating-width)] justify-between">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton
              key={index}
              className="size-[var(--rating-star-size)] rounded-full"
            />
          ))}
        </div>
        <Skeleton className="h-[var(--text-card-price--line-height)] w-3/5" />
      </div>
    </article>
  );
}

export function ProductGridSkeleton() {
  return (
    <div className={productGridClassName} aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
