export type BannerPosition = "hero" | "men" | "gifts" | "loyalty";

export type BannerDto = {
  id: number;
  title: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  position: BannerPosition | null;
};

export type Banner = {
  id: number;
  title: string;
  imageUrl: string;
  href: string | null;
  sortOrder: number;
  position: BannerPosition | null;
};

export type BannerSlots = Record<BannerPosition, Banner | null>;
