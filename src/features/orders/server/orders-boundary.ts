import "server-only";

import type { Locale } from "next-intl";

import { getOrdersPageDto } from "@/features/orders/api/orders-api.server";
import { mapOrdersPage } from "@/features/orders/api/orders-mapper";
import type { OrdersPage } from "@/features/orders/types/order.types";
import { getAccessToken } from "@/features/auth/server/auth-session";

export class OrdersAuthenticationError extends Error {
  constructor() {
    super("An authenticated session is required for Orders.");
    this.name = "OrdersAuthenticationError";
  }
}

export async function getCurrentUserOrdersPage(
  locale: Locale,
  page: number,
): Promise<OrdersPage> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new OrdersAuthenticationError();

  return mapOrdersPage(await getOrdersPageDto(locale, accessToken, page));
}
