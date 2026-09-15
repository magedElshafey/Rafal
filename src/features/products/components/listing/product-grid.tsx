import type { Locale } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/features/products/components/product-card";
import type { ListingProduct } from "@/features/products/types/product-listing.types";

type ProductGridProps = {
  locale: Locale;
  products: readonly ListingProduct[];
  ratingLabel: (value: number) => string;
  badgeLabels: Record<"discount" | "new" | "personalization", string>;
  unavailableLabel: string;
};

const productGridClassName =
  "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4";

export function ProductGrid({
  badgeLabels,
  locale,
  products,
  ratingLabel,
  unavailableLabel,
}: ProductGridProps) {
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "SAR",
  });

  return (
    <div className={productGridClassName}>
      {products.map((product) => {
        const cardProps = {
          badge: product.badge
            ? { variant: product.badge, label: badgeLabels[product.badge] }
            : undefined,
          href: `/products/${product.slug}`,
          image: product.imageUrl,
          imageAlt: product.name[locale],
          imageSizes:
            "(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 18vw",
          originalPrice: product.originalPrice
            ? currency.format(product.originalPrice)
            : undefined,
          price: currency.format(product.price),
          rating: {
            value: product.rating,
            label: ratingLabel(product.rating),
          },
          title: product.name[locale],
        };

        return product.inStock ? (
          <ProductCard key={product.id} {...cardProps} />
        ) : (
          <ProductCard
            key={product.id}
            {...cardProps}
            unavailable
            unavailableLabel={unavailableLabel}
          />
        );
      })}
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
