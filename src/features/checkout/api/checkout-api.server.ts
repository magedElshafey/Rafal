import "server-only";

import type { Locale } from "next-intl";

import { checkoutContractEndpoints } from "@/features/checkout/api/checkout-dto";
import { mapCheckoutPlaceResult } from "@/features/checkout/api/checkout-place-mapper";
import { mapCheckoutQuote } from "@/features/checkout/api/checkout-mapper";
import { parseCheckoutPlaceResponse } from "@/features/checkout/api/parse-checkout-place-dto";
import { parseCheckoutQuoteResponse } from "@/features/checkout/api/parse-checkout-dto";
import { serializeCheckoutPlaceRequest } from "@/features/checkout/api/checkout-place-serializer";
import { serializeCheckoutQuoteRequest } from "@/features/checkout/api/checkout-serializer";
import type { CheckoutVerifyRequestDto } from "@/features/checkout/api/checkout-place-dto";
import type {
  CheckoutQuote,
  CheckoutQuoteRequest,
  CheckoutPlaceRequest,
  CheckoutPlaceResult,
  CheckoutVerifyRequest,
  CheckoutVerifyResult,
} from "@/features/checkout/types/checkout.types";
import { ApiError } from "@/lib/api/api-error";
import { serverApi } from "@/lib/api/server-api";
import { parseCheckoutPaymentMethodsResponse } from "@/features/checkout/api/parse-checkout-payment-methods-dto";
import type { CheckoutPaymentMethod } from "@/features/checkout/types/checkout.types";
import type { CheckoutPlaceDiagnostics } from "@/features/checkout/server/checkout-place-diagnostics";
import { createCheckoutPlaceDiagnostics } from "@/features/checkout/server/checkout-place-diagnostics";
import { parseCheckoutHostedPaymentResult } from "@/features/checkout/api/parse-checkout-verify-result";

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

// No UI caller yet. The caller supplies the existing server-resolved Cart identity;
// discovery does not establish eligibility or launch support for any method.
export async function getCheckoutPaymentMethods(
  identity: CheckoutTransportIdentity,
  locale: Locale,
  signal?: AbortSignal,
): Promise<readonly CheckoutPaymentMethod[]> {
  const payload = await serverApi.request<unknown>({
    locale,
    path: checkoutContractEndpoints.paymentMethods,
    method: "GET",
    headers: getIdentityHeaders(identity),
    signal,
  });
  const response = parseCheckoutPaymentMethodsResponse(payload);
  if (!response.success) {
    throw new ApiError({ status: 503, code: "payment-methods-unavailable", message: "Payment methods are unavailable." });
  }
  return Object.entries(response.data).map(([code, method]) => ({ code, ...method }));
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

  const payload = await serverApi.request<unknown, FormData>({ locale,
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
  diagnostics?: CheckoutPlaceDiagnostics,
): Promise<CheckoutPlaceResult> {
  diagnostics?.stage("upstream-request");
  const serialized = serializeCheckoutPlaceRequest(input);
  const body = new FormData();
  for (const [field, value] of Object.entries(serialized)) {
    if (value !== undefined) body.append(field, value);
  }

  const payload = await serverApi.request<unknown, FormData>({ locale,
    path: checkoutContractEndpoints.place,
    onResponseStatus: diagnostics?.upstreamResponse,
    method: "POST",
    headers: {
      ...getIdentityHeaders(identity),
      "Accept-Language": locale,
    },
    body,
    signal,
  });
  diagnostics?.stage("upstream-response");
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
  diagnostics?.stage("response-parsing");
  const response = parseCheckoutPlaceResponse(payload, diagnostics?.orderParsed);
  return mapCheckoutPlaceResult(response, diagnostics);
}

export async function verifyCheckoutOrder(
  locale: Locale,
  input: CheckoutVerifyRequest,
  signal?: AbortSignal,
): Promise<CheckoutVerifyResult> {
  const diagnostics = createCheckoutPlaceDiagnostics("verify");
  try {
    diagnostics.stage("upstream-request");
    const serialized: CheckoutVerifyRequestDto = {
      phone: input.phone,
      otp: input.otp,
    };
    const body = new FormData();
    body.append("phone", serialized.phone);
    body.append("otp", serialized.otp);

    const payload = await serverApi.request<unknown, FormData>({ locale,
      path: checkoutContractEndpoints.verifyOrder(input.orderNumber),
      onResponseStatus: diagnostics.upstreamResponse,
      method: "POST",
      headers: { "Accept-Language": locale },
      body,
      signal,
    });
    diagnostics.stage("response-parsing");
    const response = parseCheckoutPlaceResponse(payload, diagnostics.orderParsed);
    if (!response.success) {
      throw new Error("The Checkout Verify API returned an unsuccessful response.");
    }

    diagnostics.stage("result-mapping");
    // Verify's documented handoff retains OTP flags; it is not a Place payment outcome.
    if (response.data.status === "pending_verification" && response.data.requires_verification === true &&
      response.meta?.requires_verification !== false && response.data.payment?.method === "card" &&
      response.data.payment.status === "pending" && response.data.payment.paid_at === null && response.meta?.payment) {
      const handoff = response.meta.payment;
      return parseCheckoutHostedPaymentResult({
        kind: "hosted-payment-required", orderNumber: response.data.order_number, displayNumber: response.data.display_number,
        handoff: { paymentUrl: handoff.payment_url, chargeId: handoff.charge_id, expiresAt: handoff.expires_at },
      }, Date.now());
    }
    const result = mapCheckoutPlaceResult(response, diagnostics);
    diagnostics.stage("confirmation-check");
    if (response.data.status !== "confirmed" || result.kind !== "confirmed") {
      throw new Error("The Checkout Verify API did not return a confirmed order.");
    }
    return result;
  } catch (error) {
    diagnostics.failure(error);
    throw error;
  }
}
