import "server-only";

import type { Locale } from "next-intl";

import { parseGuestOrderLookupResponse } from "@/features/orders/api/parse-guest-order-dto";
import type { GuestOrderLookupInput } from "@/features/orders/types/guest-order-lookup.types";
import { buildGuestOrderLookupFormData } from "@/features/orders/utils/guest-order-lookup-contract";
import { serverApi } from "@/lib/api/server-api";

export async function lookupGuestOrderDto(
  locale: Locale,
  input: GuestOrderLookupInput,
  signal?: AbortSignal,
) {
  const payload = await serverApi.request<unknown, FormData>({
    path: "/orders/lookup",
    method: "POST",
    headers: { "Accept-Language": locale },
    body: buildGuestOrderLookupFormData(input),
    signal,
  });

  return parseGuestOrderLookupResponse(payload);
}
