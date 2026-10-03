import "server-only";

import type { Locale } from "next-intl";

import { checkoutContractEndpoints } from "@/features/checkout/api/checkout-dto";
import { mapCheckoutQuote } from "@/features/checkout/api/checkout-mapper";
import { parseCheckoutQuoteResponse } from "@/features/checkout/api/parse-checkout-dto";
import { serializeCheckoutQuoteRequest } from "@/features/checkout/api/checkout-serializer";
import type {
  CheckoutQuote,
  CheckoutQuoteRequest,
} from "@/features/checkout/types/checkout.types";
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
