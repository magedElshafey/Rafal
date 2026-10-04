import type { Locale } from "next-intl";

import type {
  GuestOrderLookupInput,
  GuestOrderLookupResult,
} from "@/features/orders/types/guest-order-lookup.types";

export async function lookupGuestOrderFromBrowser(
  locale: Locale,
  input: GuestOrderLookupInput,
): Promise<GuestOrderLookupResult> {
  try {
    const response = await fetch("/api/orders/lookup", {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Accept-Language": locale,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    return (await response.json()) as GuestOrderLookupResult;
  } catch {
    return { ok: false, code: "service-unavailable" };
  }
}
