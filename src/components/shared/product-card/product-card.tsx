import Image, { type ImageProps } from "next/image";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { HeartIcon, PlusIcon } from "@/components/ui/icons";
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

export interface ProductCardAction
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  label: string;
}

interface ProductCardBaseProps {
  title: string;
  image: ImageProps["src"];
  imageAlt: string;
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

function ProductCardContent({
  image,
  imageAlt,
  imagePriority,
  originalPrice,
  price,
  rating,
  title,
}: Pick<
  ProductCardProps,
  | "image"
  | "imageAlt"
  | "imagePriority"
  | "originalPrice"
  | "price"
  | "rating"
  | "title"
>) {
  return (
    <>
      <div className="relative aspect-square w-full overflow-hidden rounded-sm bg-gray-50">
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority={imagePriority}
          sizes="170px"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col items-end gap-1 px-1.5">
        <h3 className="w-full truncate text-end type-ui-sm font-normal text-gray-1000">
          {title}
        </h3>
        {rating ? <Rating value={rating.value} label={rating.label} /> : null}
        <PriceDisplay price={price} originalPrice={originalPrice} />
      </div>
    </>
  );
}

export function ProductCard({
  badge,
  className,
  href,
  image,
  imageAlt,
  imagePriority,
  originalPrice,
  price,
  quickAddAction,
  rating,
  title,
  unavailable = false,
  unavailableLabel,
  wishlistAction,
}: ProductCardProps) {
  const visibleBadge = unavailable
    ? unavailableLabel
      ? { variant: "unavailable" as const, label: unavailableLabel }
      : undefined
    : badge;
  const { label: wishlistLabel, ...wishlistButtonProps } = wishlistAction;
  const { label: quickAddLabel, ...quickAddButtonProps } = quickAddAction ?? {
    label: "",
  };

  const content = (
    <ProductCardContent
      image={image}
      imageAlt={imageAlt}
      imagePriority={imagePriority}
      originalPrice={originalPrice}
      price={price}
      rating={rating}
      title={title}
    />
  );

  return (
    <article
      className={cn(
        "relative flex h-60 w-[var(--product-card-size)] flex-col gap-2 rounded-md bg-gray-0 pb-2.5",
        className,
      )}
    >
      {href ? (
        <Link
          href={href}
          className="flex flex-col gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {content}
        </Link>
      ) : (
        <div className="flex flex-col gap-2">{content}</div>
      )}

      {visibleBadge ? (
        <Badge
          variant={visibleBadge.variant}
          className="absolute start-2 top-2 z-10"
        >
          {visibleBadge.label}
        </Badge>
      ) : null}

      <IconButton
        {...wishlistButtonProps}
        aria-label={wishlistLabel}
        size="sm"
        variant="ghost"
        className="absolute end-2 top-2 z-10 size-7 bg-gray-0 shadow-[var(--shadow-floating-action)] [&_svg]:size-3.5"
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
          className="absolute start-2 top-30 z-10 bg-gold-500 text-gray-1000"
        >
          <PlusIcon />
        </IconButton>
      ) : null}
    </article>
  );
}
