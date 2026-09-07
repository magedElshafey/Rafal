import Image, { type ImageProps } from "next/image";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { HeartIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { PriceDisplay } from "./price-display";
import { Rating } from "./rating";

export interface ProductCardBadge {
  variant: NonNullable<BadgeProps["variant"]>;
  label: ReactNode;
}

export interface ProductCardRating {
  value: number;
  label: string;
}

export interface ProductCardAction extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label"
> {
  label: string;
}

interface ProductCardBaseProps {
  title: string;
  image: ImageProps["src"];
  imageAlt: string;
  imageSizes: NonNullable<ImageProps["sizes"]>;
  price: ReactNode;
  originalPrice?: ReactNode;
  href?: string;
  badge?: ProductCardBadge;
  rating?: ProductCardRating;
  wishlistAction: ProductCardAction;
  quickAddAction?: ProductCardAction;
  imagePriority?: boolean;
  className?: string;
}

export type ProductCardProps = ProductCardBaseProps &
  (
    | { unavailable?: false; unavailableLabel?: never }
    | { unavailable: true; unavailableLabel: ReactNode }
  );

interface ProductMediaProps extends Pick<
  ProductCardProps,
  "badge" | "image" | "imageAlt" | "imagePriority" | "imageSizes"
> {
  quickAddAction?: ProductCardAction;
  unavailable: boolean;
  unavailableLabel?: ReactNode;
  wishlistAction: ProductCardAction;
}

function ProductMedia({
  badge,
  image,
  imageAlt,
  imagePriority,
  imageSizes,
  quickAddAction,
  unavailable,
  unavailableLabel,
  wishlistAction,
}: ProductMediaProps) {
  const visibleBadge = unavailable
    ? unavailableLabel
      ? { variant: "unavailable" as const, label: unavailableLabel }
      : undefined
    : badge;
  const { label: wishlistLabel, ...wishlistButtonProps } = wishlistAction;
  const { label: quickAddLabel, ...quickAddButtonProps } = quickAddAction ?? {
    label: "",
  };

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-sm bg-gray-50">
      <Image
        src={image}
        alt={imageAlt}
        fill
        priority={imagePriority}
        sizes={imageSizes}
        className="object-cover"
      />

      {visibleBadge ? (
        <Badge
          variant={visibleBadge.variant}
          className="pointer-events-none absolute end-2 top-2 z-10"
        >
          {visibleBadge.label}
        </Badge>
      ) : null}

      <IconButton
        {...wishlistButtonProps}
        aria-label={wishlistLabel}
        size="productCard"
        variant="ghost"
        className="absolute start-2 top-2 z-20 bg-gray-0 shadow-[var(--shadow-product-card-wishlist)]"
      >
        <HeartIcon />
      </IconButton>

      {quickAddAction && quickAddLabel ? (
        <IconButton
          {...quickAddButtonProps}
          aria-label={quickAddLabel}
          disabled={unavailable || quickAddAction.disabled}
          size="sm"
          variant="filled"
          className="absolute end-2 bottom-[var(--product-card-quick-add-offset-block-end)] z-20 bg-gold-500 text-gray-0 shadow-[var(--shadow-product-card-quick-add)]"
        >
          <span
            aria-hidden="true"
            className="type-body-lg font-bold leading-none"
          >
            +
          </span>
        </IconButton>
      ) : null}
    </div>
  );
}

function ProductInfo({
  href,
  originalPrice,
  price,
  rating,
  title,
}: Pick<
  ProductCardProps,
  "href" | "originalPrice" | "price" | "rating" | "title"
>) {
  return (
    <div className="flex flex-col items-end gap-1 px-1.5">
      <h3 className="w-full truncate text-end type-ui-sm font-normal text-gray-1000">
        {href ? (
          <Link
            href={href}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {title}
          </Link>
        ) : (
          title
        )}
      </h3>
      {rating ? <Rating value={rating.value} label={rating.label} /> : null}
      <PriceDisplay price={price} originalPrice={originalPrice} />
    </div>
  );
}

export function ProductCard({
  badge,
  className,
  href,
  image,
  imageAlt,
  imagePriority,
  imageSizes,
  originalPrice,
  price,
  quickAddAction,
  rating,
  title,
  unavailable = false,
  unavailableLabel,
  wishlistAction,
}: ProductCardProps) {
  return (
    <article
      className={cn(
        "relative flex w-full self-start flex-col gap-2 rounded-md bg-gray-0 pb-2.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className,
      )}
    >
      <ProductMedia
        badge={badge}
        image={image}
        imageAlt={imageAlt}
        imagePriority={imagePriority}
        imageSizes={imageSizes}
        quickAddAction={quickAddAction}
        unavailable={unavailable}
        unavailableLabel={unavailableLabel}
        wishlistAction={wishlistAction}
      />
      <ProductInfo
        href={href}
        originalPrice={originalPrice}
        price={price}
        rating={rating}
        title={title}
      />
    </article>
  );
}
