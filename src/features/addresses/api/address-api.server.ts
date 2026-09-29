import "server-only";

import type { Locale } from "next-intl";

import {
  parseAddressListResponse,
  parseAddressResponse,
  parseDeleteAddressResponse,
} from "@/features/addresses/api/parse-address-dto";
import type {
  CreateAddressDto,
  UpdateAddressDto,
} from "@/features/addresses/api/address-dto";
import {
  mapCreateAddressInput,
  mapUpdateAddressInput,
} from "@/features/addresses/api/address-mapper";
import {
  ADDRESS_PAGE_SIZE,
  type CreateAddressInput,
  type UpdateAddressInput,
} from "@/features/addresses/types/address.types";
import { serverApi } from "@/lib/api/server-api";

function authHeaders(locale: Locale, accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Accept-Language": locale,
  };
}

export async function getAddressPageDto(
  locale: Locale,
  accessToken: string,
  page: number,
) {
  const payload = await serverApi.request<unknown>({
    path: "/addresses",
    headers: authHeaders(locale, accessToken),
    query: { page, per_page: ADDRESS_PAGE_SIZE },
  });
  return parseAddressListResponse(payload);
}

export async function createAddressDto(
  locale: Locale,
  accessToken: string,
  input: CreateAddressInput,
) {
  const payload = await serverApi.request<unknown, CreateAddressDto>({
    path: "/addresses",
    method: "POST",
    headers: authHeaders(locale, accessToken),
    body: mapCreateAddressInput(input),
  });
  return parseAddressResponse(payload);
}

export async function updateAddressDto(
  locale: Locale,
  accessToken: string,
  addressId: number,
  input: UpdateAddressInput,
) {
  const payload = await serverApi.request<unknown, UpdateAddressDto>({
    path: `/addresses/${addressId}`,
    method: "PUT",
    headers: authHeaders(locale, accessToken),
    body: mapUpdateAddressInput(input),
  });
  return parseAddressResponse(payload);
}

export async function deleteAddressDto(
  locale: Locale,
  accessToken: string,
  addressId: number,
) {
  const payload = await serverApi.request<unknown>({
    path: `/addresses/${addressId}`,
    method: "DELETE",
    headers: authHeaders(locale, accessToken),
  });
  return parseDeleteAddressResponse(payload);
}
