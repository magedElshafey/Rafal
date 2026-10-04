import "server-only";

import type { Locale } from "next-intl";

import {
  getOrderDetailsDto,
  getOrdersPageDto,
} from "@/features/orders/api/orders-api.server";
import {
  mapOrderDetails,
  mapOrdersPage,
} from "@/features/orders/api/orders-mapper";
import type {
  OrderDetails,
  OrdersPage,
} from "@/features/orders/types/order.types";
import { getAccessToken } from "@/features/auth/server/auth-session";
import { ApiError } from "@/lib/api/api-error";

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

export type OrderDetailsReadResult =
  | { kind: "found"; order: OrderDetails }
  | { kind: "not-found" };

export async function getCurrentUserOrderDetails(
  locale: Locale,
  orderNumber: string,
): Promise<OrderDetailsReadResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new OrdersAuthenticationError();

  try {
    const response = await getOrderDetailsDto(
      locale,
      accessToken,
      orderNumber,
    );
    return { kind: "found", order: mapOrderDetails(response) };
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 403 || error.status === 404)
    ) {
      return { kind: "not-found" };
    }
    throw error;
  }
}
