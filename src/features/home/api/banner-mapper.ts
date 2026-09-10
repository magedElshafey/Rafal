import type { Banner, BannerDto } from "@/features/home/types";

function isSafeHref(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function mapBannerDto(dto: BannerDto): Banner {
  return {
    id: dto.id,
    title: dto.title,
    imageUrl: dto.image_url,
    href: dto.link_url && isSafeHref(dto.link_url) ? dto.link_url : null,
    sortOrder: dto.sort_order,
  };
}
