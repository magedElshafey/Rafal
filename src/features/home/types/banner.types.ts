export type BannerDto = {
  id: number;
  title: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
};

export type Banner = {
  id: number;
  title: string;
  imageUrl: string;
  href: string | null;
  sortOrder: number;
};
