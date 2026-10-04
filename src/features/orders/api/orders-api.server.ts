import "server-only";

import type { Locale } from "next-intl";

import {
  parseOrderDetailsResponse,
  parseOrdersPageResponse,
} from "@/features/orders/api/parse-orders-dto";
import { serverApi } from "@/lib/api/server-api";

export async function getOrdersPageDto(
  locale: Locale,
  accessToken: string,
  page: number,
) {
  const payload = await serverApi.request<unknown>({
    path: "/orders",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": locale,
    },
    query: { page },
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
