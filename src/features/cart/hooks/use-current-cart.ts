import { useQuery } from "@tanstack/react-query";
import type { Locale } from "next-intl";

import { currentCartQueryOptions } from "@/features/cart/api/cart-query";
import type { CartSnapshot } from "@/features/cart/types/cart.types";

export function useCurrentCart(locale: Locale, initialData?: CartSnapshot) {
  return useQuery({ ...currentCartQueryOptions(locale), initialData });
}
