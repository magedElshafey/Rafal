import "server-only";

import type { Locale } from "next-intl";

import { parseOrderReturnResponse } from "@/features/order-returns/api/parse-order-return-dto";
import type { OrderReturnReason } from "@/features/order-returns/types/order-return.types";
import { mapOrderReturnSubmission } from "@/features/order-returns/utils/order-return-contract";
import { serverApi } from "@/lib/api/server-api";

function authHeaders(locale: Locale, accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Accept-Language": locale,
  };
}

export async function getOrderReturnDto(
  locale: Locale,
  accessToken: string,
  orderNumber: string,
) {
  const payload = await serverApi.request<unknown>({
    path: `/orders/${encodeURIComponent(orderNumber)}/return-request`,
    headers: authHeaders(locale, accessToken),
  });

  return parseOrderReturnResponse(payload);
}

export async function createOrderReturnDto(
  locale: Locale,
  accessToken: string,
  orderNumber: string,
  reason: OrderReturnReason,
  signal?: AbortSignal,
) {
  const payload = await serverApi.request<unknown>({
    path: `/orders/${encodeURIComponent(orderNumber)}/return-request`,
    method: "POST",
    headers: authHeaders(locale, accessToken),
    body: mapOrderReturnSubmission(reason),
    retry: false,
    signal,
  });

  return parseOrderReturnResponse(payload);
}
