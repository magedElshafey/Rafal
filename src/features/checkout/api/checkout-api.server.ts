import "server-only";

import type { Locale } from "next-intl";

import { checkoutContractEndpoints } from "@/features/checkout/api/checkout-dto";
import { mapCheckoutPlaceResult } from "@/features/checkout/api/checkout-place-mapper";
import { mapCheckoutQuote } from "@/features/checkout/api/checkout-mapper";
import { parseCheckoutPlaceResponse } from "@/features/checkout/api/parse-checkout-place-dto";
import { parseCheckoutQuoteResponse } from "@/features/checkout/api/parse-checkout-dto";
import { serializeCheckoutPlaceRequest } from "@/features/checkout/api/checkout-place-serializer";
import { serializeCheckoutQuoteRequest } from "@/features/checkout/api/checkout-serializer";
import type {
  CheckoutQuote,
  CheckoutQuoteRequest,
  CheckoutPlaceRequest,
  CheckoutPlaceResult,
} from "@/features/checkout/types/checkout.types";
import { ApiError } from "@/lib/api/api-error";
import { serverApi } from "@/lib/api/server-api";

export type CheckoutTransportIdentity =
  | { kind: "guest"; token: string }
  | { kind: "authenticated"; bearerToken: string };

function getIdentityHeaders(
  identity: CheckoutTransportIdentity,
): HeadersInit {
  return identity.kind === "authenticated"
    ? { Authorization: `Bearer ${identity.bearerToken}` }
    : { "X-Cart-Token": identity.token };
}

export async function quoteCheckout(
  identity: CheckoutTransportIdentity,
  locale: Locale,
  input: CheckoutQuoteRequest,
  signal?: AbortSignal,
): Promise<CheckoutQuote> {
  const serialized = serializeCheckoutQuoteRequest(input);
  const body = new FormData();

  for (const [field, value] of Object.entries(serialized)) {
    body.append(field, value);
  }

  const payload = await serverApi.request<unknown, FormData>({
    path: checkoutContractEndpoints.quote,
    method: "POST",
    headers: {
      ...getIdentityHeaders(identity),
      "Accept-Language": locale,
    },
    body,
    signal,
  });
  const response = parseCheckoutQuoteResponse(payload);

  if (!response.success) {
    throw new Error("The Checkout API returned an unsuccessful response.");
  }

  return mapCheckoutQuote(response.data);
}

export async function placeCheckout(
  identity: CheckoutTransportIdentity,
  locale: Locale,
  input: CheckoutPlaceRequest,
  signal?: AbortSignal,
): Promise<CheckoutPlaceResult> {
  const serialized = serializeCheckoutPlaceRequest(input);
  const body = new FormData();
  for (const [field, value] of Object.entries(serialized)) {
    if (value !== undefined) body.append(field, value);
  }

  const payload = await serverApi.request<unknown, FormData>({
    path: checkoutContractEndpoints.place,
    method: "POST",
    headers: {
      ...getIdentityHeaders(identity),
      "Accept-Language": locale,
    },
    body,
    signal,
  });
  if (
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    (payload as Record<string, unknown>).success === false
  ) {
    const data = (payload as Record<string, unknown>).data;
    throw new ApiError({
      status: 409,
      code: "checkout-rejected",
      details:
        typeof data === "object" && data !== null && !Array.isArray(data)
          ? data
          : undefined,
      message: "Checkout Place was rejected by the backend.",
    });
  }
  const response = parseCheckoutPlaceResponse(payload);
  return mapCheckoutPlaceResult(response);
}
