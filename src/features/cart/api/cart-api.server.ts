import "server-only";

import type { Locale } from "next-intl";

import type { AddCartItemDto, CartResponseDto, UpdateCartItemDto } from "@/features/cart/api/cart-dto";
import { cartContractEndpoints } from "@/features/cart/api/cart-dto";
import { parseCartResponse } from "@/features/cart/api/parse-cart-dto";
import {
  getCartAddResponseFacts,
  type CartAddDiagnostics,
} from "@/features/cart/server/cart-add-diagnostics";
import { serverApi } from "@/lib/api/server-api";

export type CartTransportIdentity =
  | { kind: "guest"; token: string | null }
  | { kind: "authenticated"; bearerToken: string };

function getIdentityHeaders(identity: CartTransportIdentity): HeadersInit {
  if (identity.kind === "authenticated") {
    return { Authorization: `Bearer ${identity.bearerToken}` };
  }
  return identity.token ? { "X-Cart-Token": identity.token } : {};
}

async function cartRequest<TBody = unknown>({
  body,
  identity,
  method,
  path,
  locale,
  diagnostics,
}: {
  body?: TBody;
  identity: CartTransportIdentity;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  locale: Locale;
  diagnostics?: CartAddDiagnostics;
}): Promise<CartResponseDto> {
  diagnostics?.stage("laravel-request-start");
  const payload = await serverApi.request<unknown, TBody>({
    path,
    method,
    headers: { ...getIdentityHeaders(identity), "Accept-Language": locale },
    body,
  });
  diagnostics?.stage("laravel-response", getCartAddResponseFacts(payload));
  const response = parseCartResponse(payload);
  diagnostics?.stage("parse-complete");
  return response;
}

export function getCartDto(identity: CartTransportIdentity, locale: Locale) {
  return cartRequest({ identity, locale, path: cartContractEndpoints.current });
}

export function addCartItemDto(
  identity: CartTransportIdentity,
  locale: Locale,
  body: AddCartItemDto,
  diagnostics?: CartAddDiagnostics,
) {
  return cartRequest({ identity, locale, path: cartContractEndpoints.items, method: "POST", body, diagnostics });
}

export function updateCartItemDto(identity: CartTransportIdentity, locale: Locale, lineId: number, body: UpdateCartItemDto) {
  return cartRequest({ identity, locale, path: `${cartContractEndpoints.items}/${lineId}`, method: "PATCH", body });
}

export function removeCartItemDto(identity: CartTransportIdentity, locale: Locale, lineId: number) {
  return cartRequest({ identity, locale, path: `${cartContractEndpoints.items}/${lineId}`, method: "DELETE" });
}

export function clearCartDto(identity: CartTransportIdentity, locale: Locale) {
  return cartRequest({ identity, locale, path: cartContractEndpoints.current, method: "DELETE" });
}
