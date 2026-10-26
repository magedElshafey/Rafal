import type { Locale } from "next-intl";

import type {
  CheckoutVerifyRequest,
  CheckoutVerifyResult,
} from "@/features/checkout/types/checkout.types";
import { ApiError } from "@/lib/api/api-error";
import { parseCheckoutVerifyResult } from "@/features/checkout/api/parse-checkout-verify-result";

export async function verifyCheckoutOrderFromBrowser(
  locale: Locale,
  request: CheckoutVerifyRequest,
): Promise<CheckoutVerifyResult> {
  const response = await fetch(
    `/api/checkout/orders/${encodeURIComponent(request.orderNumber)}/verify?${new URLSearchParams({ locale })}`,
    {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone: request.phone, otp: request.otp }),
    },
  );

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      message: "Checkout order verification failed.",
    });
  }

  return parseCheckoutVerifyResult(await response.json());
}
