import {
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query";
import type { Locale } from "next-intl";

import { loadAvailableCartCoupons } from "@/features/cart/actions/cart-coupons";
import type {
  CartCouponError,
  CartSnapshot,
} from "@/features/cart/types/cart.types";

const AVAILABLE_CART_COUPONS_STALE_TIME = 30_000;

export class CartCouponQueryError extends Error {
  constructor(readonly code: CartCouponError["code"]) {
    super(`Cart coupon query failed: ${code}.`);
    this.name = "CartCouponQueryError";
  }
}

export const availableCartCouponsQueryKeyRoot = [
  "cart",
  "coupons",
] as const;

export function availableCartCouponsQueryKey(locale: Locale) {
  return [...availableCartCouponsQueryKeyRoot, locale] as const;
}

export function availableCartCouponsQueryOptions(locale: Locale) {
  return queryOptions({
    queryKey: availableCartCouponsQueryKey(locale),
    queryFn: async () => {
      const result = await loadAvailableCartCoupons(locale);
      if (!result.ok) throw new CartCouponQueryError(result.error.code);
      return result.coupons;
    },
    gcTime: 0,
    retry: false,
    staleTime: AVAILABLE_CART_COUPONS_STALE_TIME,
  });
}

export async function syncAvailableCartCouponsAfterCartChange(
  queryClient: QueryClient,
  locale: Locale,
  cart: CartSnapshot,
) {
  const filters = {
    queryKey: availableCartCouponsQueryKey(locale),
    exact: true,
  } as const;

  if (cart.lines.length === 0) {
    await queryClient.cancelQueries(filters);
    queryClient.removeQueries(filters);
    return;
  }

  await queryClient.invalidateQueries(filters);
}
