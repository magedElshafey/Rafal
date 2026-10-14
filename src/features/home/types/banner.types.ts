export type BannerPosition = "hero" | "men" | "gifts" | "loyalty";

export type BannerDto = {
  id: number;
  title: string;
  image_url: string;
  link_url: string | null;
  product_id: number | null;
  category_id: number | null;
  product_slug: string | null;
  category_slug: string | null;
  sort_order: number;
  position: BannerPosition;
};

export type Banner = {
  id: number;
  title: string;
  imageUrl: string;
  href: string | null;
  sortOrder: number;
  position: BannerPosition;
};

export type BannerSlots = Record<BannerPosition, readonly Banner[]>;
