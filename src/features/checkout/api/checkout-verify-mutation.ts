import type { Locale } from "next-intl";

import type {
  CheckoutVerifyRequest,
  CheckoutVerifyResult,
} from "@/features/checkout/types/checkout.types";
import { ApiError } from "@/lib/api/api-error";

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
      body: JSON.stringify({ email: request.email, otp: request.otp }),
    },
  );

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      message: "Checkout order verification failed.",
    });
  }

  return response.json() as Promise<CheckoutVerifyResult>;
}
