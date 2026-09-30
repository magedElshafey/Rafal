import type {
  Banner,
  BannerDto,
  BannerPosition,
  BannerSlots,
} from "@/features/home/types";

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
    position: dto.position,
  };
}

export function resolveBannerSlots(banners: readonly BannerDto[]): BannerSlots {
  const slots: BannerSlots = { hero: null, men: null, gifts: null, loyalty: null };
  const unresolved: Banner[] = [];

  for (const dto of banners) {
    const banner = mapBannerDto(dto);
    if (banner.position !== null && slots[banner.position] === null) {
      slots[banner.position] = banner;
    } else {
      unresolved.push(banner);
    }
  }

  // Temporary fallback until backend position data is reliable. Explicit slots
  // are reserved first; duplicate positions never replace their first owner.
  unresolved.sort((left, right) => left.sortOrder - right.sortOrder);
  const positions: readonly BannerPosition[] = ["hero", "men", "gifts", "loyalty"];
  let fallbackIndex = 0;
  for (const position of positions) {
    if (slots[position] === null) {
      const banner = unresolved[fallbackIndex++];
      slots[position] = banner ? { ...banner, position } : null;
    }
  }
  return slots;
}
