import "server-only";

import type { Locale } from "next-intl";

import {
  cancelOrderDto,
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
import {
  assertCancelledOrderIdentity,
  OrderIdentityMismatchError,
} from "@/features/orders/utils/order-cancellation";
import { getAccessToken } from "@/features/auth/server/auth-session";
import { ApiError } from "@/lib/api/api-error";

export class OrdersAuthenticationError extends Error {
  constructor() {
    super("An authenticated session is required for Orders.");
    this.name = "OrdersAuthenticationError";
  }
}

export { OrderIdentityMismatchError };

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

export async function cancelCurrentUserOrder(
  locale: Locale,
  orderNumber: string,
  signal?: AbortSignal,
): Promise<OrderDetails> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new OrdersAuthenticationError();

  const response = await cancelOrderDto(
    locale,
    accessToken,
    orderNumber,
    signal,
  );

  if (response.data.order_number !== orderNumber) {
    console.error("[orders:cancel] response identity mismatch", {
      requestedOrderNumber: orderNumber,
      responseOrderNumber: response.data.order_number,
    });
    assertCancelledOrderIdentity(orderNumber, response.data.order_number);
  }

  return mapOrderDetails(response);
}
