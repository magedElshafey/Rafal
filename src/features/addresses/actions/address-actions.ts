"use server";

import { hasLocale } from "next-intl";

import {
  AddressAuthenticationError,
  createCurrentUserAddress,
  deleteCurrentUserAddress,
  updateCurrentUserAddress,
} from "@/features/addresses/server/address-boundary";
import type {
  AddressInputField,
  AddressMutationError,
  AddressMutationResult,
  DeleteAddressResult,
} from "@/features/addresses/types/address.types";
import {
  parseCreateAddressInput,
  parseUpdateAddressInput,
} from "@/features/addresses/utils/validate-address";
import { mapProtectedAuthActionError } from "@/features/auth/actions/auth-action-utils";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api/api-error";

const backendFieldMap: Readonly<Record<string, AddressInputField>> = {
  label: "label",
  recipient_name: "recipientName",
  recipient_phone: "recipientPhone",
  city_id: "cityId",
  district: "district",
  street_details: "streetDetails",
  is_default: "isDefault",
};

function positiveBackendId(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function validationFields(details: unknown): readonly AddressInputField[] {
  if (typeof details !== "object" || details === null || Array.isArray(details)) {
    return [];
  }
  return Object.keys(details)
    .map((field) => backendFieldMap[field])
    .filter((field): field is AddressInputField => field !== undefined);
}

async function mapActionError(error: unknown): Promise<AddressMutationError> {
  if (error instanceof AddressAuthenticationError) {
    return { code: "unauthorized" };
  }
  if (error instanceof ApiError) {
    if (error.status === 400) return { code: "invalid-input" };
    if (error.status === 401) {
      await mapProtectedAuthActionError(error);
      return { code: "unauthorized" };
    }
    if (error.status === 403) return { code: "unauthorized" };
    if (error.status === 404) return { code: "not-found" };
    if (error.status === 422) {
      return { code: "validation-rejected", fields: validationFields(error.details) };
    }
  }
  return { code: "service-unavailable" };
}

function validLocale(locale: unknown): locale is (typeof routing.locales)[number] {
  return typeof locale === "string" && hasLocale(routing.locales, locale);
}

export async function createAddress(
  value: unknown,
  locale: unknown,
): Promise<AddressMutationResult> {
  if (!validLocale(locale)) return { ok: false, error: { code: "invalid-input" } };
  const parsed = parseCreateAddressInput(value);
  if (!parsed.ok) {
    return {
      ok: false,
      error: { code: "validation-rejected", fields: Object.keys(parsed.errors) as AddressInputField[] },
    };
  }

  try {
    return { ok: true, address: await createCurrentUserAddress(locale, parsed.input) };
  } catch (error) {
    return { ok: false, error: await mapActionError(error) };
  }
}

export async function updateAddress(
  addressId: unknown,
  value: unknown,
  locale: unknown,
): Promise<AddressMutationResult> {
  const backendId = positiveBackendId(addressId);
  if (!backendId || !validLocale(locale)) {
    return { ok: false, error: { code: "invalid-input" } };
  }
  const parsed = parseUpdateAddressInput(value);
  if (!parsed.ok) {
    return {
      ok: false,
      error: { code: "validation-rejected", fields: Object.keys(parsed.errors) as AddressInputField[] },
    };
  }

  try {
    return {
      ok: true,
      address: await updateCurrentUserAddress(locale, backendId, parsed.input),
    };
  } catch (error) {
    return { ok: false, error: await mapActionError(error) };
  }
}

export async function deleteAddress(
  addressId: unknown,
  locale: unknown,
): Promise<DeleteAddressResult> {
  const backendId = positiveBackendId(addressId);
  if (!backendId || !validLocale(locale)) {
    return { ok: false, error: { code: "invalid-input" } };
  }

  try {
    await deleteCurrentUserAddress(locale, backendId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: await mapActionError(error) };
  }
}
