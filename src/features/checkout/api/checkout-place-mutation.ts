import type { Locale } from "next-intl";

import type {
  CheckoutPlaceRequest,
  CheckoutPlaceResult,
  CheckoutUnavailableLine,
} from "@/features/checkout/types/checkout.types";
import { ApiError } from "@/lib/api/api-error";

type PlaceErrorBody = {
  code?: unknown;
  unavailableLines?: unknown;
};

function isUnavailableLine(value: unknown): value is CheckoutUnavailableLine {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const line = value as Record<string, unknown>;
  const productName = line.productName;
  return (
    Number.isSafeInteger(line.cartItemId) &&
    typeof productName === "object" &&
    productName !== null &&
    !Array.isArray(productName) &&
    typeof (productName as Record<string, unknown>).ar === "string" &&
    typeof (productName as Record<string, unknown>).en === "string" &&
    Number.isSafeInteger(line.requested) &&
    Number.isSafeInteger(line.available) &&
    Number.isSafeInteger(line.variantTotalRequested)
  );
}

export async function placeCheckoutFromBrowser(
  locale: Locale,
  request: CheckoutPlaceRequest,
): Promise<CheckoutPlaceResult> {
  const response = await fetch(
    `/api/checkout/place?${new URLSearchParams({ locale })}`,
    {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    let body: PlaceErrorBody = {};
    try {
      body = (await response.json()) as PlaceErrorBody;
    } catch {
      // Safe generic fallback below.
    }
    const unavailableLines = Array.isArray(body.unavailableLines)
      ? body.unavailableLines.filter(isUnavailableLine)
      : [];
    throw new ApiError({
      status: response.status,
      code: typeof body.code === "string" ? body.code : undefined,
      details: unavailableLines,
      message: "Checkout Place request failed.",
    });
  }

  return response.json() as Promise<CheckoutPlaceResult>;
}
