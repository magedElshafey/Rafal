import { notFound } from "next/navigation";

import { getAddressById } from "@/features/addresses/api/get-addresses";
import { AddressEditor } from "@/features/addresses/components/address-editor";

type EditAddressPageProps = {
  params: Promise<{ addressId: string }>;
};

export default async function EditAddressPage({
  params,
}: EditAddressPageProps) {
  const { addressId } = await params;
  const address = await getAddressById(addressId);

  if (!address) notFound();

  return <AddressEditor mode="edit" address={address} />;
}
