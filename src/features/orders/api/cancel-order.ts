import type { Locale } from "next-intl";

import { ApiError } from "@/lib/api/api-error";

type CancelOrderErrorBody = {
  code?: unknown;
};

export async function cancelOrderFromBrowser(
  locale: Locale,
  orderNumber: string,
): Promise<void> {
  const response = await fetch(
    `/api/orders/${encodeURIComponent(orderNumber)}/cancel?${new URLSearchParams({ locale })}`,
    {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    },
  );

  if (response.ok) return;

  let body: CancelOrderErrorBody = {};
  try {
    body = (await response.json()) as CancelOrderErrorBody;
  } catch {
    // The UI owns the localized generic fallback.
  }

  throw new ApiError({
    status: response.status,
    code: typeof body.code === "string" ? body.code : undefined,
    message: "Cancel Order request failed.",
  });
}
