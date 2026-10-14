import type {
  Banner,
  BannerDto,
  BannerPosition,
  BannerSlots,
} from "@/features/home/types";

function destinationHref(dto: BannerDto): string | null {
  const hasProduct = dto.product_id !== null || dto.product_slug !== null;
  const hasCategory = dto.category_id !== null || dto.category_slug !== null;
  // Ambiguous destinations remain visible without choosing a target.
  if (hasProduct === hasCategory) return null;

  const id = hasProduct ? dto.product_id : dto.category_id;
  const slug = hasProduct ? dto.product_slug : dto.category_slug;
  if (
    id === null || !Number.isSafeInteger(id) || id <= 0 ||
    !slug || slug === "." || slug === ".." ||
    /[\s/\\?#%\u0000-\u001f\u007f]/u.test(slug)
  ) return null;

  try {
    // Match the existing ProductCard and category-navigation slug routes.
    return `/${hasProduct ? "products" : "categories"}/${encodeURIComponent(slug)}`;
  } catch {
    return null;
  }
}

export function mapBannerDto(dto: BannerDto): Banner {
  return {
    id: dto.id,
    title: dto.title,
    imageUrl: dto.image_url,
    href: destinationHref(dto),
    sortOrder: dto.sort_order,
    position: dto.position,
  };
}

export function resolveBannerSlots(banners: readonly BannerDto[]): BannerSlots {
  const slots: Record<BannerPosition, Banner[]> = {
    hero: [], men: [], gifts: [], loyalty: [],
  };

  for (const dto of banners) {
    const banner = mapBannerDto(dto);
    slots[banner.position].push(banner);
  }

  for (const group of Object.values(slots)) {
    // Array.sort is stable, preserving API order for equal sort values.
    group.sort((left, right) => left.sortOrder - right.sortOrder);
  }
  return slots;
}
