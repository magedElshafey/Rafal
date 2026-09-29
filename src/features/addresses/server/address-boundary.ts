import "server-only";

import type { Locale } from "next-intl";

import {
  createAddressDto,
  deleteAddressDto,
  getAddressPageDto,
  updateAddressDto,
} from "@/features/addresses/api/address-api.server";
import { mapAddress, mapAddressPage } from "@/features/addresses/api/address-mapper";
import type {
  Address,
  AddressPage,
  CreateAddressInput,
  UpdateAddressInput,
} from "@/features/addresses/types/address.types";
import { getAccessToken } from "@/features/auth/server/auth-session";
import { ApiError } from "@/lib/api/api-error";

export class AddressAuthenticationError extends Error {
  constructor() {
    super("An authenticated session is required for Addresses.");
    this.name = "AddressAuthenticationError";
  }
}

export function isRecoverableAddressListError(error: unknown): boolean {
  if (error instanceof AddressAuthenticationError) return true;
  if (error instanceof ApiError) {
    return (
      error.status === 401 ||
      error.status === 403 ||
      error.status === 408 ||
      error.status === 429 ||
      error.status >= 500
    );
  }
  if (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    return true;
  }
  return (
    error instanceof TypeError &&
    (error.message === "fetch failed" || error.message === "Failed to fetch")
  );
}

async function requireAddressAccessToken(): Promise<string> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new AddressAuthenticationError();
  return accessToken;
}

function assertSuccess(success: boolean, operation: string) {
  if (!success) throw new Error(`The Addresses API ${operation} failed.`);
}

export async function getAddressPage(locale: Locale, page: number): Promise<AddressPage> {
  const response = await getAddressPageDto(
    locale,
    await requireAddressAccessToken(),
    page,
  );
  assertSuccess(response.success, "list request");
  return mapAddressPage(response);
}

export async function createCurrentUserAddress(
  locale: Locale,
  input: CreateAddressInput,
): Promise<Address> {
  const response = await createAddressDto(
    locale,
    await requireAddressAccessToken(),
    input,
  );
  assertSuccess(response.success, "create request");
  return mapAddress(response.data);
}

export async function updateCurrentUserAddress(
  locale: Locale,
  addressId: number,
  input: UpdateAddressInput,
): Promise<Address> {
  const response = await updateAddressDto(
    locale,
    await requireAddressAccessToken(),
    addressId,
    input,
  );
  assertSuccess(response.success, "update request");
  return mapAddress(response.data);
}

export async function deleteCurrentUserAddress(
  locale: Locale,
  addressId: number,
): Promise<void> {
  const response = await deleteAddressDto(
    locale,
    await requireAddressAccessToken(),
    addressId,
  );
  assertSuccess(response.success, "delete request");
}
