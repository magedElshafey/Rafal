import type { ProductImage } from "@/features/products/types/product-details.types";

/** Retain a valid selection, otherwise prefer the current variant, then order. */
export function resolveGalleryImageId(
  images: readonly ProductImage[],
  selectedId: string | null,
  preferredIds: readonly string[] = [],
): string | null {
  const ids = new Set(images.map((image) => image.id));
  if (selectedId !== null && ids.has(selectedId)) return selectedId;
  return preferredIds.find((id) => ids.has(id)) ?? images[0]?.id ?? null;
}

export function getRelativeGalleryIndex(index: number, offset: number, count: number) {
  if (count === 0) return -1;
  return ((Math.max(0, index) + offset) % count + count) % count;
}

export function getGalleryArrowOffset(key: string, direction: "ltr" | "rtl") {
  if (key !== "ArrowLeft" && key !== "ArrowRight") return 0;
  const offset = key === "ArrowRight" ? 1 : -1;
  return direction === "rtl" ? -offset : offset;
}
