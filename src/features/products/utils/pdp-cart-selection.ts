import type { CartSnapshot } from "@/features/cart/types/cart.types";

export function getPdpCartLine(cart: CartSnapshot | undefined, productId: string, variantId: string | null, personalizable: boolean) {
  if (personalizable || variantId === null) return null;
  const matches = cart?.lines.filter((line) => line.product.id === productId && line.variant.id === variantId) ?? [];
  return matches.length === 1 && matches[0].personalization === null ? matches[0] : null;
}

export function getPdpCartLineCeiling(cart: CartSnapshot | undefined, projection: CartSnapshot | undefined, lineId: string, cityId: number | null) {
  const line = cart?.lines.find((item) => item.id === lineId);
  const available = projection?.lines.find((item) => item.id === lineId && item.variant.id === line?.variant.id)?.availability;
  const limit = cart?.maxCartItemQuantity;
  if (!cart || !line || cityId === null || available?.cityId !== cityId || !available.inStock || typeof limit !== "number") return null;
  const otherQuantity = cart.lines.reduce((sum, item) => item.id !== lineId && item.variant.id === line.variant.id ? sum + item.quantity : sum, 0);
  return Math.max(0, Math.min(available.available, limit) - otherQuantity);
}
