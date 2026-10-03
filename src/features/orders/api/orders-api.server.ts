import "server-only";

import type { Locale } from "next-intl";

import { parseOrdersPageResponse } from "@/features/orders/api/parse-orders-dto";
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
