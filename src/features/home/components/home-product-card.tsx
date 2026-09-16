import type { Locale } from "next-intl";

import { ProductCard } from "@/features/products/components/product-card/product-card";
import type { HomeProduct } from "@/features/home/types/home-product.types";
import { ProductWishlistAction } from "@/features/wishlist/components/product-wishlist-action";

type HomeProductCardLabels = {
  discount: string;
  new: string;
  personalization: string;
  rating: (value: number) => string;
};

type HomeProductCardProps = {
  labels: HomeProductCardLabels;
  locale: Locale;
  product: HomeProduct;
};

export function HomeProductCard({
  labels,
  locale,
  product,
}: HomeProductCardProps) {
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "SAR",
  });
  const badge = product.badge
    ? {
        variant: product.badge,
        label: labels[product.badge],
      }
    : undefined;

  return (
    <ProductCard
      badge={badge}
      href={`/products/${product.slug}`}
      image={product.imageUrl}
      imageAlt={product.name[locale]}
      imageSizes="(max-width: 639px) 58vw, (max-width: 767px) 34vw, (max-width: 1023px) 25vw, 16vw"
      originalPrice={
        product.originalPrice
          ? currency.format(product.originalPrice)
          : undefined
      }
      price={currency.format(product.price)}
      rating={{
        value: product.rating,
        label: labels.rating(product.rating),
      }}
      title={product.name[locale]}
      wishlistControl={<ProductWishlistAction productId={product.id} />}
    />
  );
}

export type { HomeProductCardLabels };
