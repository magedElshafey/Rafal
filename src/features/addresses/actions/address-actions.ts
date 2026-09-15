"use server";

import { mockAddressRecords } from "@/features/addresses/api/mock-addresses";
import { MAX_SAVED_ADDRESSES } from "@/features/addresses/constants/address.constants";
import type {
  AddressInput,
  AddressMutationResult,
} from "@/features/addresses/types/saved-address.types";
import { validateAddress } from "@/features/addresses/utils/validate-address";
import { requireUser } from "@/features/auth/server/auth-boundary";

export async function createAddress(
  input: AddressInput,
): Promise<AddressMutationResult> {
  const user = await requireUser("/account/addresses/new");
  const errors = validateAddress(input);

  if (Object.keys(errors).length > 0) {
    return { ok: false, reason: "validation", errors };
  }

  const addressCount = mockAddressRecords.filter(
    (record) => record.customerId === user.id,
  ).length;
  if (addressCount >= MAX_SAVED_ADDRESSES) {
    return { ok: false, reason: "maximum-reached" };
  }

  // Temporary no-op. A future backend must make isDefault the sole default.
  return { ok: true };
}

export async function updateAddress(
  addressId: string,
  input: AddressInput,
): Promise<AddressMutationResult> {
  const user = await requireUser("/account/addresses");
  const errors = validateAddress(input);

  if (Object.keys(errors).length > 0) {
    return { ok: false, reason: "validation", errors };
  }

  const ownedAddress = mockAddressRecords.find(
    (record) =>
      record.customerId === user.id && record.address.id === addressId,
  );
  if (!ownedAddress) return { ok: false, reason: "not-found" };

  // Temporary no-op. A future backend must make isDefault the sole default.
  return { ok: true };
}

export async function deleteAddress(
  addressId: string,
): Promise<AddressMutationResult> {
  const user = await requireUser("/account/addresses");
  const ownedAddress = mockAddressRecords.find(
    (record) =>
      record.customerId === user.id && record.address.id === addressId,
  );

  if (!ownedAddress) return { ok: false, reason: "not-found" };
  if (ownedAddress.address.isDefault) {
    return { ok: false, reason: "default-address-delete-unsupported" };
  }

  // Temporary no-op until the authenticated Addresses API exists.
  return { ok: true };
}

export async function setDefaultAddress(
  addressId: string,
): Promise<AddressMutationResult> {
  const user = await requireUser("/account/addresses");
  const ownedAddress = mockAddressRecords.find(
    (record) =>
      record.customerId === user.id && record.address.id === addressId,
  );

  if (!ownedAddress) return { ok: false, reason: "not-found" };

  // Temporary no-op. The future backend operation must unset every other default.
  return { ok: true };
}
