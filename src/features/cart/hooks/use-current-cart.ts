import { useQuery } from "@tanstack/react-query";
import type { Locale } from "next-intl";

import { currentCartQueryOptions } from "@/features/cart/api/cart-query";

export function useCurrentCart(locale: Locale) {
  return useQuery(currentCartQueryOptions(locale));
}
