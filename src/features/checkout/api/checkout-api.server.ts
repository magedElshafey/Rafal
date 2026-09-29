import "server-only";

import type { Locale } from "next-intl";

import type {
  CheckoutPaymentMethodsResponseDto,
  CheckoutQuoteRequestDto,
  CheckoutQuoteResponseDto,
  CheckoutShippingMethodsResponseDto,
} from "@/features/checkout/api/checkout-dto";
import { checkoutContractEndpoints } from "@/features/checkout/api/checkout-dto";
import {
  mapCheckoutPaymentMethods,
  mapCheckoutQuote,
  mapCheckoutQuoteRequest,
  mapCheckoutShippingMethod,
} from "@/features/checkout/api/checkout-mapper";
import {
  parseCheckoutPaymentMethodsResponse,
  parseCheckoutQuoteResponse,
  parseCheckoutShippingMethodsResponse,
} from "@/features/checkout/api/parse-checkout-dto";
import type {
  CheckoutPaymentMethod,
  CheckoutQuote,
  CheckoutQuoteRequest,
  CheckoutShippingMethod,
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

function buildCheckoutQuoteFormData(
  input: CheckoutQuoteRequestDto,
): FormData {
  const formData = new FormData();

  formData.append("city_id", String(input.city_id));

  if (input.shipping_method_id !== undefined) {
    formData.append(
      "shipping_method_id",
      String(input.shipping_method_id),
    );
  }

  if (input.address_id !== undefined) {
    formData.append("address_id", String(input.address_id));
    return formData;
  }

  formData.append("address[recipient_name]", input.address.recipient_name);
  formData.append("address[recipient_phone]", input.address.recipient_phone);
  formData.append("address[district]", input.address.district);
  formData.append("address[street_details]", input.address.street_details);

  return formData;
}

async function getCheckoutShippingMethodsDto(
  locale: Locale,
): Promise<CheckoutShippingMethodsResponseDto> {
  const payload = await serverApi.request<unknown>({
    path: checkoutContractEndpoints.shippingMethods,
    headers: { "Accept-Language": locale },
  });

  return parseCheckoutShippingMethodsResponse(payload);
}

export async function getCheckoutShippingMethods(
  locale: Locale,
): Promise<readonly CheckoutShippingMethod[]> {
  const response = await getCheckoutShippingMethodsDto(locale);

  return response.data.map(mapCheckoutShippingMethod);
}

async function getCheckoutPaymentMethodsDto(
  locale: Locale,
): Promise<CheckoutPaymentMethodsResponseDto> {
  const payload = await serverApi.request<unknown>({
    path: checkoutContractEndpoints.paymentMethods,
    headers: { "Accept-Language": locale },
  });

  return parseCheckoutPaymentMethodsResponse(payload);
}

export async function getCheckoutPaymentMethods(
  locale: Locale,
): Promise<readonly CheckoutPaymentMethod[]> {
  const response = await getCheckoutPaymentMethodsDto(locale);

  return mapCheckoutPaymentMethods(response.data);
}

async function quoteCheckoutDto(
  identity: CheckoutTransportIdentity,
  locale: Locale,
  input: CheckoutQuoteRequestDto,
): Promise<CheckoutQuoteResponseDto> {
  const payload = await serverApi.request<unknown, FormData>({
    path: checkoutContractEndpoints.quote,
    method: "POST",
    headers: {
      ...getIdentityHeaders(identity),
      "Accept-Language": locale,
    },
    body: buildCheckoutQuoteFormData(input),
  });

  return parseCheckoutQuoteResponse(payload);
}

export async function quoteCheckout(
  identity: CheckoutTransportIdentity,
  locale: Locale,
  input: CheckoutQuoteRequest,
): Promise<CheckoutQuote> {
  const response = await quoteCheckoutDto(
    identity,
    locale,
    mapCheckoutQuoteRequest(input),
  );

  return mapCheckoutQuote(response.data);
}
