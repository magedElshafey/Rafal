import "server-only";

import { mockAddressRecords } from "@/features/addresses/api/mock-addresses";
import type { SavedAddress } from "@/features/addresses/types/saved-address.types";
import { requireUser } from "@/features/auth/server/auth-boundary";

export async function getAddresses(): Promise<SavedAddress[]> {
  const user = await requireUser("/account/addresses");

  return mockAddressRecords
    .filter((record) => record.customerId === user.id)
    .map((record) => record.address);
}

export async function getAddressById(
  addressId: string,
): Promise<SavedAddress | null> {
  const user = await requireUser("/account/addresses");
  const record = mockAddressRecords.find(
    (item) => item.customerId === user.id && item.address.id === addressId,
  );

  return record?.address ?? null;
}
