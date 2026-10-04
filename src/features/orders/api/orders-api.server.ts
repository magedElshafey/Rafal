import "server-only";

import type { Locale } from "next-intl";

import {
  parseOrderDetailsResponse,
  parseOrdersPageResponse,
} from "@/features/orders/api/parse-orders-dto";
import { buildOrdersListQuery } from "@/features/orders/api/orders-query";
import type { OrderCustomerStatus } from "@/features/orders/utils/order-filters";
import { serverApi } from "@/lib/api/server-api";

export async function getOrdersPageDto(
  locale: Locale,
  accessToken: string,
  page: number,
  customerStatuses?: readonly OrderCustomerStatus[],
) {
  const payload = await serverApi.request<unknown>({
    path: "/orders",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": locale,
    },
    query: buildOrdersListQuery(page, customerStatuses),
  });

  return parseOrdersPageResponse(payload);
}

export async function getOrderDetailsDto(
  locale: Locale,
  accessToken: string,
  orderNumber: string,
) {
  const payload = await serverApi.request<unknown>({
    path: `/orders/${encodeURIComponent(orderNumber)}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": locale,
    },
  });

  return parseOrderDetailsResponse(payload);
}

export async function cancelOrderDto(
  locale: Locale,
  accessToken: string,
  orderNumber: string,
  signal?: AbortSignal,
) {
  const payload = await serverApi.request<unknown>({
    path: `/orders/${encodeURIComponent(orderNumber)}/cancel`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": locale,
    },
    signal,
  });

  return parseOrderDetailsResponse(payload);
}
