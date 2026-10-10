import type { Locale } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import {
  ProductCard,
  type ProductCardAction,
} from "@/features/products/components/product-card";
import { ProductQuickAddControl } from "@/features/products/components/product-card/product-quick-add-control";
import type { ListingProduct } from "@/features/products/types/product-listing.types";
import { WishlistHeart } from "@/features/wishlist/components/wishlist-heart";
import { cn } from "@/lib/utils";

type ProductGridProps = {
  wishlistAccountId?: string | null;
  className?: string;
  locale: Locale;
  products: readonly ListingProduct[];
  ratingLabel: (value: string) => string;
  reviewsLabel: (count: number) => string;
  badgeLabels: Record<"discount" | "new" | "personalization", string>;
  unavailableLabel: string;
  getWishlistAction?: (product: ListingProduct) => ProductCardAction;
};

const productGridClassName =
  "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4";

export function ListingProductCard({
  badgeLabels,
  getWishlistAction,
  wishlistAccountId,
  locale,
  product,
  ratingLabel,
  reviewsLabel,
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
    badge: product.badges?.[0]
      ? { variant: "primary" as const, label: product.badges[0] }
      : product.badge
        ? { variant: product.badge, label: badgeLabels[product.badge] }
        : undefined,
    href: `/products/${product.slug}`,
    image: product.imageUrl,
    secondaryImage: product.secondaryImageUrl,
    imageAlt: name,
    imageSizes: "(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 18vw",
    originalPrice: product.originalPrice
      ? currency.format(product.originalPrice)
      : undefined,
    price: currency.format(product.price),
    rating: {
      value: product.ratingAverage,
      label: ratingLabel(product.ratingAverage.toFixed(1)),
      reviewsLabel: reviewsLabel(product.reviewsCount),
    },
    title: name,
    quickAddControl: (
      <ProductQuickAddControl
        disabled={!product.inStock}
        locale={locale}
        productId={product.id}
        productName={product.name}
        quickAdd={product.quickAdd}
        slug={product.slug}
      />
    ),
    wishlistAction: getWishlistAction?.(product),
    wishlistControl:
      !getWishlistAction && wishlistAccountId !== undefined ? (
        <WishlistHeart
          accountId={wishlistAccountId}
          productId={product.id}
          isWishlisted={product.isWishlisted}
        />
      ) : undefined,
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
  wishlistAccountId,
  locale,
  products,
  ratingLabel,
  reviewsLabel,
  unavailableLabel,
}: ProductGridProps) {
  return (
    <div className={cn(productGridClassName, className)}>
      {products.map((product) => (
        <ListingProductCard
          key={product.id}
          badgeLabels={badgeLabels}
          getWishlistAction={getWishlistAction}
          wishlistAccountId={wishlistAccountId}
          locale={locale}
          product={product}
          ratingLabel={ratingLabel}
          reviewsLabel={reviewsLabel}
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
      <div className="flex flex-col items-start gap-1 px-1.5">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-[var(--text-card-discount-price--line-height)] w-3/5" />
        <div className="flex h-4 items-center gap-1">
          <Skeleton className="size-3.5 rounded-full" />
          <Skeleton className="h-3.5 w-6" />
          <Skeleton className="h-3.5 w-14" />
        </div>
      </div>
    </article>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={productGridClassName} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
