import type { Locale } from "next-intl";

import { WishlistHeart } from "@/features/wishlist/components/wishlist-heart";
import { ProductCard } from "@/features/products/components/product-card/product-card";
import { ProductQuickAddControl } from "@/features/products/components/product-card/product-quick-add-control";
import type { HomeProduct } from "@/features/home/types/home-product.types";

type HomeProductCardLabels = {
  discount: string;
  new: string;
  personalization: string;
  rating: (value: string) => string;
  reviews: (count: number) => string;
};

type HomeProductCardProps = {
  accountId: string | null;
  labels: HomeProductCardLabels;
  locale: Locale;
  product: HomeProduct;
};

export function HomeProductCard({
  accountId,
  labels,
  locale,
  product,
}: HomeProductCardProps) {
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "SAR",
  });
  const badge = product.badges?.[0]
    ? {
        variant: "primary" as const,
        label: product.badges[0],
      }
    : undefined;

  return (
    <ProductCard
      wishlistControl={
        <WishlistHeart
          accountId={accountId}
          productId={product.id}
          isWishlisted={product.isWishlisted}
        />
      }
      badge={badge}
      href={`/products/${product.slug}`}
      image={product.imageUrl}
      secondaryImage={product.secondaryImageUrl}
      imageAlt={product.name}
      imageSizes="(max-width: 639px) 58vw, (max-width: 767px) 34vw, (max-width: 1023px) 25vw, 16vw"
      originalPrice={
        product.originalPrice
          ? currency.format(product.originalPrice)
          : undefined
      }
      price={currency.format(product.price)}
      rating={{
        value: product.ratingAverage,
        label: labels.rating(product.ratingAverage.toFixed(1)),
        reviewsLabel: labels.reviews(product.reviewsCount),
      }}
      title={product.name}
      quickAddControl={
        <ProductQuickAddControl
          disabled={!product.inStock}
          locale={locale}
          productId={product.id}
          productName={product.name}
          quickAdd={product.quickAdd}
          slug={product.slug}
        />
      }
    />
  );
}

export type { HomeProductCardLabels };
